import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Oneclick,
  Options,
  IntegrationApiKeys,
  IntegrationCommerceCodes,
  Environment,
} from 'transbank-sdk';

export interface EnrollmentStartResult {
  redirectUrl: string;
  sessionToken: string;
}

export interface EnrollmentConfirmResult {
  tbkUser: string;
  last4: string;
  cardType: string; // CREDIT | DEBIT
}

@Injectable()
export class TransbankService {
  private readonly logger = new Logger(TransbankService.name);

  constructor(private readonly config: ConfigService) {}

  private get isProduction(): boolean {
    return this.config.get<string>('TRANSBANK_ENVIRONMENT', 'TEST').toUpperCase() === 'PRODUCTION';
  }

  private inscriptionClient() {
    if (this.isProduction) {
      return new Oneclick.MallInscription(
        new Options(
          this.config.get<string>('TRANSBANK_COMMERCE_CODE', ''),
          this.config.get<string>('TRANSBANK_API_KEY', ''),
          Environment.Production,
        ),
      );
    }
    return new Oneclick.MallInscription(
      new Options(
        IntegrationCommerceCodes.ONECLICK_MALL,
        IntegrationApiKeys.WEBPAY,
        Environment.Integration,
      ),
    );
  }

  /**
   * Inicia el proceso de inscripción Oneclick Mall.
   * Retorna la URL del formulario Transbank y el token de sesión.
   */
  async startEnrollment(username: string, email: string, returnUrl: string): Promise<EnrollmentStartResult> {
    try {
      const response = await this.inscriptionClient().start(username, email, returnUrl);
      const redirectUrl = `${response.url_webpay}?TBK_TOKEN=${response.token}`;
      this.logger.log(`Transbank enrollment started for ${username}`);
      return { redirectUrl, sessionToken: response.token };
    } catch (err: any) {
      this.logger.error(`Transbank startEnrollment error: ${err?.message}`, err);
      throw new BadRequestException('Error al iniciar inscripción en Transbank: ' + (err?.message ?? 'desconocido'));
    }
  }

  /**
   * Confirma la inscripción usando el TBK_TOKEN devuelto por Transbank.
   * Retorna el tbkUser (token permanente) y datos de la tarjeta.
   */
  async confirmEnrollment(token: string): Promise<EnrollmentConfirmResult> {
    try {
      const response = await this.inscriptionClient().finish(token);
      const cardNum: string = response.card_number ?? '';
      const last4 = cardNum.length >= 4 ? cardNum.slice(-4) : cardNum;
      this.logger.log(`Transbank enrollment confirmed, tbkUser=${response.tbk_user}`);
      return {
        tbkUser:  response.tbk_user,
        last4,
        cardType: response.card_type ?? 'CREDIT',
      };
    } catch (err: any) {
      this.logger.error(`Transbank confirmEnrollment error: ${err?.message}`, err);
      throw new BadRequestException('Error al confirmar inscripción en Transbank: ' + (err?.message ?? 'desconocido'));
    }
  }

  /**
   * Elimina la inscripción en Transbank usando el tbkUser.
   */
  async removeCard(tbkUser: string, username: string): Promise<void> {
    try {
      await this.inscriptionClient().delete(tbkUser, username);
      this.logger.log(`Transbank card removed for ${username}`);
    } catch (err: any) {
      this.logger.error(`Transbank removeCard error: ${err?.message}`, err);
      // No lanzamos excepción — si falla en Transbank igual limpiamos la DB
    }
  }
}
