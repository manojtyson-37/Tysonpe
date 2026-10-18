/**
 * The id of the form that saves one gateway as the user's preference. The demo page renders one form per gateway
 * (each bound to its own server action) and the radio group submits the matching one, so both sides share this name.
 */
export const gatewayFormId = (gatewayId: string): string => `gateway-form-${gatewayId}`;
