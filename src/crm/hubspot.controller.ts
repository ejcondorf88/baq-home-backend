import { Controller, Get, Post, Query, Body, Logger } from '@nestjs/common';
import { HubSpotService } from './hubspot.service';
import { CreateContactDto } from '../dto/create-contact.dto';
//import { SendEmailDto } from '../dto/send-email.dto';

@Controller('hubspot')
export class HubSpotController {

  private readonly logger = new Logger(HubSpotController.name);

  constructor(private readonly hubSpotService: HubSpotService) {}

  @Get('contacts')
  async getContacts(@Query('limit') limit: string) {
    const contacts = await this.hubSpotService.getContacts(parseInt(limit) || 10);
    return { success: true, data: contacts };
  }

  @Post('contacts')
  async createContact(@Body() createContactDto: CreateContactDto) {
    const contact = await this.hubSpotService.createContact(createContactDto);
    return { success: true, data: contact };
  }

  /**@Post('send-email')
  async sendEmailToContacts(@Body() sendEmailDto: SendEmailDto) {
    try {
      const { emailId } = sendEmailDto;
      if (!emailId) {
        this.logger.error('emailId is required');
        throw new Error('emailId is required');
      }
      const contacts = await this.hubSpotService.getContacts();
      this.logger.log(`Retrieved contacts: ${JSON.stringify(contacts)}`);
      const contactIds = contacts.map(contact => contact.id);
      this.logger.log(`Creating static list with contact IDs: ${contactIds.join(', ')}`);
      const listId = await this.hubSpotService.createStaticList(contactIds);
      const response = await this.hubSpotService.sendMarketingEmail(listId, emailId);
      this.logger.log(`Sent email to list ${listId}`);
      return { success: true, data: response };
    } catch (error) {
      this.logger.error(`Error sending email: ${error.message}`);
      throw error;
    }
  }*/
}