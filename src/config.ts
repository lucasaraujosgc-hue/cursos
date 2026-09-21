/**
 * WhatsApp number that receives the "dúvida ou sugestão" messages sent from the
 * end of a course, in E.164 digits (no +, no spaces).
 *
 * Nothing here sends messages on its own: the course builds a wa.me link and the
 * visitor's own phone opens WhatsApp with the text pre-filled. The send is always
 * a manual tap by the visitor, from their own number.
 */
export const CONTACT_WHATSAPP = '5575991161728';

/** Pretty version of the number above, for display only. */
export const CONTACT_WHATSAPP_LABEL = '(75) 99116-1728';

export function buildWhatsappLink(message: string) {
  return `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
