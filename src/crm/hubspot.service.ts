import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as HubSpot from '@hubspot/api-client';
import { CreateContactDto } from '../dto/create-contact.dto';
import fetch from 'node-fetch';

// Interfaces para las respuestas de la API
interface ListCreateResponse {
  list: {
    listId: string;
    name: string;
    processingType: string;
    objectTypeId: string;
    createdAt: string;
    updatedAt: string;
    filtersUpdatedAt: string;
    processingStatus: string;
    createdById: string;
    updatedById: string;
    listPermissions: {
      teamsWithEditAccess: string[];
      usersWithEditAccess: string[];
    };
    membershipSettings: {
      membershipTeamId: string | null;
      includeUnassigned: boolean | null;
    };
    [key: string]: any;
  };
}

interface MembershipResponse {
  updated?: string[];
  skipped?: string[];
}

interface HubSpotErrorResponse {
  status: string;
  message: string;
  correlationId?: string;
  category?: string;
}

@Injectable()
export class HubSpotService {
  private readonly hubspotClient: HubSpot.Client;
  private readonly logger = new Logger(HubSpotService.name);

  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get<string>('HUBSPOT_ACCESS_TOKEN');
    console.log('Token:', accessToken); // Depuración
    if (!accessToken) {
      throw new Error('HUBSPOT_ACCESS_TOKEN not found in environment variables');
    }
    this.hubspotClient = new HubSpot.Client({ accessToken });
  }

  async getContacts(limit: number = 10): Promise<any> {
    try {
      const response = await this.hubspotClient.crm.contacts.basicApi.getPage(
        limit,
        undefined,
        ['firstname', 'email']
      );
      this.logger.log(`Retrieved ${response.results.length} contacts from HubSpot`);
      return response.results;
    } catch (error) {
      this.logger.error(`Error fetching contacts: ${error.message}`);
      throw error;
    }
  }

  async createContact(createContactDto: CreateContactDto): Promise<any> {
    try {
      const contactInput: any = {
        properties: {
          firstname: createContactDto.firstname,
          email: createContactDto.email,
        },
      };
      const response = await this.hubspotClient.crm.contacts.basicApi.create(contactInput);
      this.logger.log(`Created contact with ID ${response.id} in HubSpot`);
      return response;
    } catch (error) {
      this.logger.error(`Error creating contact: ${error.message}`);
      throw error;
    }
  }

  async createStaticList(contactIds: string[]): Promise<string> {
    try {
      if (!contactIds || contactIds.length === 0) {
        this.logger.error('No contact IDs provided');
        throw new Error('No contact IDs provided');
      }
      this.logger.log(`Creating static list with contact IDs: ${contactIds.join(', ')}`);
      const listInput = {
        name: `Static List ${new Date().toISOString()}`,
        listType: 'STATIC',
        objectTypeId: '0-1',
        processingType: 'MANUAL',
      };
      this.logger.log(`Request body (create list): ${JSON.stringify(listInput, null, 2)}`);
      const accessToken = this.configService.get<string>('HUBSPOT_ACCESS_TOKEN');
      const createListResponse = await fetch('https://api.hubapi.com/crm/v3/lists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listInput),
      });
      const createListData = await createListResponse.json();
      const createListResult: ListCreateResponse | HubSpotErrorResponse = createListData as ListCreateResponse | HubSpotErrorResponse;
      this.logger.log(`HTTP status (create list): ${createListResponse.status}`);
      this.logger.log(`API response (create list): ${JSON.stringify(createListResult, null, 2)}`);

      if (!createListResponse.ok) {
        const errorResponse = createListResult as HubSpotErrorResponse;
        this.logger.error(`API error (create list): ${JSON.stringify(errorResponse, null, 2)}`);
        throw new Error(`API error (create list): ${errorResponse.message || 'Unknown error'}`);
      }

      const successResponse = createListResult as ListCreateResponse;
      if (!successResponse.list || !successResponse.list.listId) {
        this.logger.error('Invalid response format: listId not found');
        throw new Error('Invalid response format: listId not found');
      }
      const listId = successResponse.list.listId;
      this.logger.log(`Created static list with ID ${listId}`);

      // Añadir contactos a la lista
      const membershipInput = {
        objectIds: contactIds,
      };
      this.logger.log(`Request body (add memberships): ${JSON.stringify(membershipInput, null, 2)}`);
      const addMembersResponse = await fetch(`https://api.hubapi.com/crm/v3/lists/${listId}/memberships`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(membershipInput),
      });
      this.logger.log(`HTTP status (add memberships): ${addMembersResponse.status}`);
      
      // Inspeccionar respuesta cruda si no es JSON
      let addMembersData: any;
      try {
        addMembersData = await addMembersResponse.json();
        this.logger.log(`API response (add memberships): ${JSON.stringify(addMembersData, null, 2)}`);
      } catch (parseError) {
        const rawText = await addMembersResponse.text();
        this.logger.error(`Failed to parse membership response as JSON. Raw response: ${rawText.slice(0, 200)}...`);
        throw new Error(`Failed to parse membership response: ${parseError.message}`);
      }

      if (!addMembersResponse.ok) {
        const errorResponse = addMembersData as HubSpotErrorResponse;
        this.logger.error(`API error (add memberships): ${JSON.stringify(errorResponse, null, 2)}`);
        throw new Error(`API error (add memberships): ${errorResponse.message || 'Unknown error'}`);
      }

      const membershipResult = addMembersData as MembershipResponse;
      if (!membershipResult.updated || membershipResult.updated.length === 0) {
        this.logger.warn(`No contacts were added to list ${listId}. Skipped: ${JSON.stringify(membershipResult.skipped || [])}`);
      } else {
        this.logger.log(`Added ${membershipResult.updated.length} contacts to list ${listId}`);
      }

      return listId;
    } catch (error) {
      this.logger.error(`Error creating static list: ${error.message}`);
      throw error;
    }
  }

  async sendMarketingEmail(listId: string, emailId: number): Promise<any> {
    try {
      const emailCampaign = {
        name: `Email Campaign ${new Date().toISOString()}`,
        listIds: [listId],
        emailId,
      };
      const response = await this.hubspotClient.apiRequest({
        method: 'POST',
        path: '/marketing/v3/emails',
        body: emailCampaign,
      });
      this.logger.log(`Sent marketing email to list ${listId}`);
      return response;
    } catch (error) {
      this.logger.error(`Error sending marketing email: ${error.message}`);
      throw error;
    }
  }
}