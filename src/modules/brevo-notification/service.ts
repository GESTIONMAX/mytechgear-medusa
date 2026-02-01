import { Logger } from "@medusajs/framework/types"
import * as brevo from "@getbrevo/brevo"

type InjectedDependencies = {
  logger: Logger
}

interface BrevoModuleOptions {
  apiKey: string
  senderEmail: string
  senderName?: string
}

interface EmailData {
  to: string
  subject: string
  html?: string
  text?: string
  template_id?: number
  params?: Record<string, any>
}

/**
 * Service Brevo pour l'envoi d'emails transactionnels
 *
 * Gère tous les emails automatiques de la boutique:
 * - Confirmation de commande
 * - Confirmation d'expédition
 * - Réinitialisation de mot de passe
 * - Création de compte
 *
 * Utilise l'API Brevo (ex-Sendinblue) pour l'envoi
 */
export default class BrevoNotificationService {
  protected logger_: Logger
  protected apiKey_: string
  protected senderEmail_: string
  protected senderName_: string
  protected apiInstance_: brevo.TransactionalEmailsApi

  constructor(
    { logger }: InjectedDependencies,
    options: BrevoModuleOptions
  ) {
    this.logger_ = logger
    this.apiKey_ = options.apiKey
    this.senderEmail_ = options.senderEmail
    this.senderName_ = options.senderName || "MyTechGear"

    // Initialiser l'API Brevo
    this.apiInstance_ = new brevo.TransactionalEmailsApi()
    this.apiInstance_.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      this.apiKey_
    )

    this.logger_.info("✉️  Brevo notification service initialized")
  }

  /**
   * Envoie un email transactionnel
   */
  async sendEmail(data: EmailData): Promise<void> {
    try {
      const sendSmtpEmail = new brevo.SendSmtpEmail()

      // Expéditeur
      sendSmtpEmail.sender = {
        email: this.senderEmail_,
        name: this.senderName_,
      }

      // Destinataire
      sendSmtpEmail.to = [{ email: data.to }]

      // Sujet
      sendSmtpEmail.subject = data.subject

      // Contenu (template ID ou HTML/texte brut)
      if (data.template_id) {
        sendSmtpEmail.templateId = data.template_id
        sendSmtpEmail.params = data.params || {}
      } else {
        if (data.html) {
          sendSmtpEmail.htmlContent = data.html
        }
        if (data.text) {
          sendSmtpEmail.textContent = data.text
        }
      }

      // Envoi via API Brevo
      const result = await this.apiInstance_.sendTransacEmail(sendSmtpEmail)

      this.logger_.info(
        `✉️  Email sent via Brevo to ${data.to} - Subject: ${data.subject} - MessageID: ${result.body.messageId}`
      )
    } catch (error: any) {
      this.logger_.error(
        `❌ Failed to send email via Brevo - To: ${data.to} - Subject: ${data.subject} - Error: ${error.message}`
      )
      throw error
    }
  }

  /**
   * EMAIL: Confirmation de commande
   */
  async sendOrderConfirmation(
    to: string,
    orderData: {
      order_id: string
      display_id: number
      customer_name: string
      total: number
      currency: string
      items: Array<{
        title: string
        quantity: number
        price: number
      }>
    }
  ): Promise<void> {
    const itemsList = orderData.items
      .map(
        (item) =>
          `<li>${item.quantity}x ${item.title} - ${(item.price / 100).toFixed(2)}€</li>`
      )
      .join("")

    const html = `
      <h1>Merci pour votre commande !</h1>
      <p>Bonjour ${orderData.customer_name},</p>
      <p>Nous avons bien reçu votre commande <strong>#${orderData.display_id}</strong>.</p>

      <h2>Récapitulatif</h2>
      <ul>
        ${itemsList}
      </ul>

      <p><strong>Total: ${(orderData.total / 100).toFixed(2)}€</strong></p>

      <p>Nous préparons votre commande et vous tiendrons informé de son expédition.</p>

      <p>Cordialement,<br>L'équipe MyTechGear</p>
    `

    await this.sendEmail({
      to,
      subject: `Confirmation de commande #${orderData.display_id}`,
      html,
    })
  }

  /**
   * EMAIL: Confirmation d'expédition
   */
  async sendShipmentConfirmation(
    to: string,
    shipmentData: {
      order_id: string
      display_id: number
      customer_name: string
      tracking_number?: string
      carrier?: string
    }
  ): Promise<void> {
    const trackingInfo = shipmentData.tracking_number
      ? `<p>Numéro de suivi: <strong>${shipmentData.tracking_number}</strong></p>
         ${shipmentData.carrier ? `<p>Transporteur: ${shipmentData.carrier}</p>` : ""}`
      : ""

    const html = `
      <h1>Votre commande a été expédiée !</h1>
      <p>Bonjour ${shipmentData.customer_name},</p>
      <p>Bonne nouvelle ! Votre commande <strong>#${shipmentData.display_id}</strong> a été expédiée.</p>

      ${trackingInfo}

      <p>Vous devriez recevoir votre colis sous 3 à 5 jours ouvrés.</p>

      <p>Cordialement,<br>L'équipe MyTechGear</p>
    `

    await this.sendEmail({
      to,
      subject: `Votre commande #${shipmentData.display_id} est en route !`,
      html,
    })
  }

  /**
   * EMAIL: Réinitialisation de mot de passe
   */
  async sendPasswordReset(
    to: string,
    resetData: {
      customer_name: string
      reset_token: string
      reset_url: string
    }
  ): Promise<void> {
    const html = `
      <h1>Réinitialisation de mot de passe</h1>
      <p>Bonjour ${resetData.customer_name},</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe.</p>

      <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe:</p>
      <p><a href="${resetData.reset_url}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Réinitialiser mon mot de passe</a></p>

      <p>Ce lien est valable 1 heure.</p>

      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>

      <p>Cordialement,<br>L'équipe MyTechGear</p>
    `

    await this.sendEmail({
      to,
      subject: "Réinitialisation de votre mot de passe MyTechGear",
      html,
    })
  }

  /**
   * EMAIL: Création de compte
   */
  async sendWelcome(
    to: string,
    userData: {
      customer_name: string
    }
  ): Promise<void> {
    const html = `
      <h1>Bienvenue chez MyTechGear !</h1>
      <p>Bonjour ${userData.customer_name},</p>
      <p>Merci de vous être inscrit sur MyTechGear.</p>

      <p>Vous pouvez dès maintenant:</p>
      <ul>
        <li>Découvrir nos lunettes connectées de dernière génération</li>
        <li>Suivre vos commandes</li>
        <li>Gérer vos informations personnelles</li>
      </ul>

      <p>Besoin d'aide ? Notre équipe est à votre écoute.</p>

      <p>Cordialement,<br>L'équipe MyTechGear</p>
    `

    await this.sendEmail({
      to,
      subject: "Bienvenue chez MyTechGear !",
      html,
    })
  }

  /**
   * Méthode générique pour compatibilité avec l'interface Notification de Medusa
   */
  async send(
    event: string,
    data: any,
    attachmentGenerator?: any
  ): Promise<void> {
    this.logger_.info(
      `📧 Notification event received: ${event} - To: ${data.to || data.email}`
    )

    // Router vers la bonne méthode selon l'événement
    switch (event) {
      case "order.placed":
      case "order.confirmed":
        await this.sendOrderConfirmation(data.email, data)
        break

      case "order.shipment_created":
      case "order.shipped":
        await this.sendShipmentConfirmation(data.email, data)
        break

      case "customer.password_reset":
        await this.sendPasswordReset(data.email, data)
        break

      case "customer.created":
        await this.sendWelcome(data.email, data)
        break

      default:
        this.logger_.warn(`⚠️  Unhandled notification event: ${event}`)
    }
  }
}
