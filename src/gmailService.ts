/**
 * Helper service to send emails using Gmail REST API (v1) on behalf of the authorized user.
 */

interface SendEmailParams {
  accessToken: string;
  to: string;
  subject: string;
  body: string; // HTML allowed and encouraged
  pdfBase64?: string; // Optional raw base64 string of the PDF
  pdfFilename?: string; // Optional filename
}

/**
 * Sends an email using the Gmail send endpoint. Supports optional PDF attachment.
 */
export async function sendProposalEmail({
  accessToken,
  to,
  subject,
  body,
  pdfBase64,
  pdfFilename = 'Proposal.pdf',
}: SendEmailParams): Promise<{ id: string; threadId: string }> {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  let emailRaw = '';

  if (pdfBase64) {
    const boundary = `foo_bar_baz_${Math.random().toString(36).substring(2, 9)}`;
    const emailLines = [
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      body,
      '',
      `--${boundary}`,
      `Content-Type: application/pdf; name="${pdfFilename}"`,
      `Content-Disposition: attachment; filename="${pdfFilename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      pdfBase64,
      '',
      `--${boundary}--`
    ];
    emailRaw = emailLines.join('\r\n');
  } else {
    const emailLines = [
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      body,
    ];
    emailRaw = emailLines.join('\r\n');
  }

  // Base64url encode the raw MIME string
  const base64UrlEncoded = btoa(unescape(encodeURIComponent(emailRaw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64UrlEncoded,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Gmail API send error:', errorData);
    throw new Error(`Gmail API failed to send email: ${response.statusText} (${response.status})`);
  }

  return response.json();
}
