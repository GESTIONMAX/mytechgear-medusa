import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import BrevoNotificationService from "./service"

/**
 * Module Brevo Notification pour Medusa v2
 *
 * Provider d'emails transactionnels utilisant Brevo (ex-Sendinblue)
 *
 * Fonctionnalités:
 * - Envoi emails confirmation de commande
 * - Envoi emails confirmation d'expédition
 * - Envoi emails réinitialisation mot de passe
 * - Envoi emails de bienvenue
 *
 * Avantages Brevo:
 * - Serveurs EU (RGPD-compliant)
 * - Offre gratuite: 300 emails/jour
 * - Support français
 * - Interface de templates visuels
 */
export default ModuleProvider(Modules.NOTIFICATION, {
  services: [BrevoNotificationService],
})
