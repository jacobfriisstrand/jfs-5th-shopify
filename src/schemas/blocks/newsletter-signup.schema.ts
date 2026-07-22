import { defineBlock } from "../types.ts";

export default defineBlock({
  name: "t:names.newsletter_signup",
  tag: null,
  settings: [
    {
      type: "text",
      id: "heading",
      label: "t:settings.heading",
      default: "Newsletter",
    },
    {
      type: "text",
      id: "klaviyo_public_key",
      label: "t:settings.newsletter_signup.klaviyo_public_key",
      info: "t:settings.newsletter_signup.klaviyo_public_key_info",
    },
    {
      type: "text",
      id: "klaviyo_list_id",
      label: "t:settings.newsletter_signup.klaviyo_list_id",
      info: "t:settings.newsletter_signup.klaviyo_list_id_info",
    },
    {
      type: "text",
      id: "email_placeholder",
      label: "t:settings.newsletter_signup.email_placeholder",
      default: "Email address",
    },
    {
      type: "text",
      id: "submit_label",
      label: "t:settings.newsletter_signup.submit_label",
      default: "Subscribe",
    },
    {
      type: "text",
      id: "consent_label",
      label: "t:settings.newsletter_signup.consent_label",
      default: "I agree to receive marketing emails",
    },
    {
      type: "text",
      id: "success_message",
      label: "t:settings.newsletter_signup.success_message",
      default: "Thanks for subscribing!",
    },
  ],
  presets: [{ name: "t:names.newsletter_signup" }],
});
