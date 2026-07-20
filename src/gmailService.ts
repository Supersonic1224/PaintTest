/**
 * Helper service to send emails using Gmail REST API (v1) on behalf of the authorized user.
 */

interface SendEmailAttachment {
  filename: string;
  base64: string;
  contentType: string;
}

interface SendEmailParams {
  accessToken: string;
  to: string;
  bcc?: string;
  subject: string;
  body: string; // HTML allowed and encouraged
  pdfBase64?: string; // Optional raw base64 string of the PDF
  pdfFilename?: string; // Optional filename
  attachments?: SendEmailAttachment[];
}

/**
 * Sends an email using the Gmail send endpoint. Supports optional PDF and multiple attachments.
 */
export async function sendProposalEmail({
  accessToken,
  to,
  bcc,
  subject,
  body,
  pdfBase64,
  pdfFilename = 'Proposal.pdf',
  attachments = [],
}: SendEmailParams): Promise<{ id: string; threadId: string }> {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const allAttachments: SendEmailAttachment[] = [...attachments];
  if (pdfBase64) {
    allAttachments.push({
      filename: pdfFilename,
      base64: pdfBase64,
      contentType: 'application/pdf',
    });
  }

  let emailRaw = '';

  if (allAttachments.length > 0) {
    const boundary = `foo_bar_baz_${Math.random().toString(36).substring(2, 9)}`;
    const emailLines = [
      `To: ${to}`,
      ...(bcc ? [`Bcc: ${bcc}`] : []),
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
    ];

    for (const att of allAttachments) {
      emailLines.push(
        `--${boundary}`,
        `Content-Type: ${att.contentType}; name="${att.filename}"`,
        `Content-Disposition: attachment; filename="${att.filename}"`,
        'Content-Transfer-Encoding: base64',
        '',
        att.base64,
        ''
      );
    }

    emailLines.push(`--${boundary}--`);
    emailRaw = emailLines.join('\r\n');
  } else {
    const emailLines = [
      `To: ${to}`,
      ...(bcc ? [`Bcc: ${bcc}`] : []),
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
    let errorMessage = `Gmail API failed to send email: ${response.statusText} (${response.status})`;
    try {
      const parsed = JSON.parse(errorData);
      if (parsed?.error?.message) {
        errorMessage = parsed.error.message;
      }
    } catch (_) {}
    throw new Error(errorMessage);
  }

  return response.json();
}
