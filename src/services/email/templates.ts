export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function wrapBrandHtml(title: string, bodyHtml: string, footerNote?: string): string {
  const supportEmail = process.env.SUPPORT_EMAIL || "support@ticket254.co.ke";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0B1020;font-family:Inter,Segoe UI,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0B1020;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#161E2E;border:1px solid #293548;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px;background-color:#111827;border-bottom:1px solid #293548;">
              <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#F8FAFC;">TICKET<span style="color:#35D399;">254</span></span>
              <span style="float:right;font-size:12px;color:#94A3B8;line-height:28px;">International Football Ticketing</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;color:#F8FAFC;">${escapeHtml(title)}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#111827;border-top:1px solid #293548;font-size:12px;color:#94A3B8;line-height:1.6;">
              ${footerNote ? `<p style="margin:0 0 8px 0;color:#FBBF24;">${escapeHtml(footerNote)}</p>` : ""}
              <p style="margin:0;">Need assistance? Contact Ticket254 Support at <a href="mailto:${escapeHtml(supportEmail)}" style="color:#35D399;text-decoration:none;">${escapeHtml(supportEmail)}</a>.</p>
              <p style="margin:6px 0 0 0;">Ticket254 operates as an independent ticketing platform for authorised event organisers.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const emailTemplates = {
  welcome(params: { firstName: string; loginUrl: string }): RenderedEmail {
    const title = "Welcome to Ticket254";
    const html = wrapBrandHtml(
      title,
      `<p style="color:#CBD5E1;line-height:1.6;">Hi ${escapeHtml(params.firstName)},</p>
       <p style="color:#CBD5E1;line-height:1.6;">Your Ticket254 account has been created. You can now discover international and Kenyan football fixtures, manage bookings, and access digital match tickets in one secure place.</p>
       <p style="margin:24px 0;"><a href="${escapeHtml(params.loginUrl)}" style="display:inline-block;padding:12px 24px;background-color:#35D399;color:#0B1020;font-weight:700;text-decoration:none;border-radius:8px;">Access Your Account</a></p>`
    );
    const text = `Welcome to Ticket254!\n\nHi ${params.firstName},\nYour Ticket254 account is ready. Access your account at: ${params.loginUrl}`;
    return { subject: "Welcome to Ticket254", html, text };
  },

  emailVerification(params: { firstName: string; verifyUrl: string }): RenderedEmail {
    const title = "Verify Your Email Address";
    const html = wrapBrandHtml(
      title,
      `<p style="color:#CBD5E1;line-height:1.6;">Hi ${escapeHtml(params.firstName)},</p>
       <p style="color:#CBD5E1;line-height:1.6;">Please verify your email address to complete security setup on your Ticket254 account. This link expires in 24 hours.</p>
       <p style="margin:24px 0;"><a href="${escapeHtml(params.verifyUrl)}" style="display:inline-block;padding:12px 24px;background-color:#35D399;color:#0B1020;font-weight:700;text-decoration:none;border-radius:8px;">Verify Email Address</a></p>`
    );
    const text = `Hi ${params.firstName},\nVerify your Ticket254 email address within 24 hours:\n${params.verifyUrl}`;
    return { subject: "Verify your Ticket254 email address", html, text };
  },

  passwordReset(params: { firstName: string; resetUrl: string }): RenderedEmail {
    const title = "Password Reset Request";
    const html = wrapBrandHtml(
      title,
      `<p style="color:#CBD5E1;line-height:1.6;">Hi ${escapeHtml(params.firstName)},</p>
       <p style="color:#CBD5E1;line-height:1.6;">We received a request to reset your Ticket254 password. Click below within 60 minutes to choose a new password. If you did not request this, you can safely ignore this email.</p>
       <p style="margin:24px 0;"><a href="${escapeHtml(params.resetUrl)}" style="display:inline-block;padding:12px 24px;background-color:#60A5FA;color:#0B1020;font-weight:700;text-decoration:none;border-radius:8px;">Reset Password</a></p>`
    );
    const text = `Hi ${params.firstName},\nReset your Ticket254 password within 60 minutes:\n${params.resetUrl}`;
    return { subject: "Reset your Ticket254 password", html, text };
  },

  orderConfirmation(params: {
    customerName: string;
    bookingReference: string;
    eventTitle: string;
    totalFormatted: string;
    bookingUrl: string;
    isSimulated?: boolean;
  }): RenderedEmail {
    const title = `Order Initiated — ${params.bookingReference}`;
    const html = wrapBrandHtml(
      title,
      `<p style="color:#CBD5E1;line-height:1.6;">Hi ${escapeHtml(params.customerName)},</p>
       <p style="color:#CBD5E1;line-height:1.6;">Your booking reservation <strong>${escapeHtml(params.bookingReference)}</strong> for <strong>${escapeHtml(params.eventTitle)}</strong> (${escapeHtml(params.totalFormatted)}) has been created and is awaiting verified payment confirmation.</p>
       <p style="margin:24px 0;"><a href="${escapeHtml(params.bookingUrl)}" style="display:inline-block;padding:12px 24px;background-color:#35D399;color:#0B1020;font-weight:700;text-decoration:none;border-radius:8px;">View Booking Status</a></p>`,
      params.isSimulated ? "SIMULATED DEVELOPMENT TRANSACTION — NOT VALID FOR REAL STADIUM ENTRY." : undefined
    );
    const text = `Hi ${params.customerName},\nOrder ${params.bookingReference} for ${params.eventTitle} (${params.totalFormatted}) has been created.\nView status: ${params.bookingUrl}`;
    return { subject: `Order ${params.bookingReference} — ${params.eventTitle}`, html, text };
  },

  paymentConfirmation(params: {
    customerName: string;
    bookingReference: string;
    eventTitle: string;
    amountFormatted: string;
    provider: string;
    bookingUrl: string;
    isSimulated?: boolean;
  }): RenderedEmail {
    const title = `Payment Confirmed — ${params.bookingReference}`;
    const html = wrapBrandHtml(
      title,
      `<p style="color:#CBD5E1;line-height:1.6;">Hi ${escapeHtml(params.customerName)},</p>
       <p style="color:#CBD5E1;line-height:1.6;">We have verified your payment of <strong>${escapeHtml(params.amountFormatted)}</strong> via <strong>${escapeHtml(params.provider)}</strong> for <strong>${escapeHtml(params.eventTitle)}</strong>.</p>
       <p style="margin:24px 0;"><a href="${escapeHtml(params.bookingUrl)}" style="display:inline-block;padding:12px 24px;background-color:#35D399;color:#0B1020;font-weight:700;text-decoration:none;border-radius:8px;">View Confirmed Booking</a></p>`,
      params.isSimulated ? "SIMULATED DEVELOPMENT PAYMENT — NO REAL FUNDS WERE CHARGED." : undefined
    );
    const text = `Payment confirmed (${params.amountFormatted} via ${params.provider}) for booking ${params.bookingReference} (${params.eventTitle}).\nView booking: ${params.bookingUrl}`;
    return { subject: `Payment Confirmed: ${params.bookingReference}`, html, text };
  },

  ticketDelivery(params: {
    customerName: string;
    bookingReference: string;
    eventTitle: string;
    eventDateFormatted: string;
    venueName: string;
    ticketNumbers: string[];
    bookingUrl: string;
    isResend?: boolean;
    isSimulated?: boolean;
  }): RenderedEmail {
    const prefix = params.isResend ? "Resent Digital Tickets" : "Your Digital Match Tickets";
    const listItems = params.ticketNumbers
      .map((t) => `<li style="margin-bottom:6px;color:#35D399;font-family:monospace;">${escapeHtml(t)}</li>`)
      .join("");
    const html = wrapBrandHtml(
      `${prefix} — ${params.eventTitle}`,
      `<p style="color:#CBD5E1;line-height:1.6;">Hi ${escapeHtml(params.customerName)},</p>
       <p style="color:#CBD5E1;line-height:1.6;">Your digital tickets for <strong>${escapeHtml(params.eventTitle)}</strong> at <strong>${escapeHtml(params.venueName)}</strong> (${escapeHtml(params.eventDateFormatted)}) are ready.</p>
       <div style="background:#111827;border:1px solid #293548;border-radius:10px;padding:16px;margin:16px 0;">
         <p style="margin:0 0 8px 0;font-size:13px;color:#94A3B8;">Booking Reference: <strong style="color:#F8FAFC;">${escapeHtml(params.bookingReference)}</strong></p>
         <ul style="margin:0;padding-left:18px;">${listItems}</ul>
       </div>
       <p style="margin:24px 0;"><a href="${escapeHtml(params.bookingUrl)}" style="display:inline-block;padding:12px 24px;background-color:#35D399;color:#0B1020;font-weight:700;text-decoration:none;border-radius:8px;">Download PDF Tickets & QR Codes</a></p>`,
      params.isSimulated ? "SAMPLE / SIMULATED TICKETS — FOR PLATFORM DEMONSTRATION ONLY." : undefined
    );
    const text = `${prefix} for ${params.eventTitle}\nVenue: ${params.venueName} (${params.eventDateFormatted})\nBooking Ref: ${params.bookingReference}\nTickets: ${params.ticketNumbers.join(", ")}\nDownload PDF tickets: ${params.bookingUrl}`;
    return {
      subject: `${prefix}: ${params.eventTitle} (${params.bookingReference})`,
      html,
      text,
    };
  },

  eventPostponement(params: {
    customerName: string;
    eventTitle: string;
    bookingReference: string;
    newDateText: string;
    officialInstructions: string;
  }): RenderedEmail {
    const title = `Match Postponed — ${params.eventTitle}`;
    const html = wrapBrandHtml(
      title,
      `<p style="color:#CBD5E1;line-height:1.6;">Hi ${escapeHtml(params.customerName)},</p>
       <p style="color:#CBD5E1;line-height:1.6;">The organiser has announced that <strong>${escapeHtml(params.eventTitle)}</strong> (Booking <strong>${escapeHtml(params.bookingReference)}</strong>) has been postponed.</p>
       <p style="color:#60A5FA;line-height:1.6;"><strong>Updated Schedule:</strong> ${escapeHtml(params.newDateText)}</p>
       <p style="color:#CBD5E1;line-height:1.6;"><strong>Official Instructions:</strong> ${escapeHtml(params.officialInstructions)}</p>`
    );
    const text = `Match Postponed: ${params.eventTitle} (Booking ${params.bookingReference})\nUpdated Schedule: ${params.newDateText}\nInstructions: ${params.officialInstructions}`;
    return { subject: `Important Update: ${params.eventTitle} Postponed`, html, text };
  },

  eventCancellation(params: {
    customerName: string;
    eventTitle: string;
    bookingReference: string;
    officialInstructions: string;
  }): RenderedEmail {
    const title = `Match Cancelled — ${params.eventTitle}`;
    const html = wrapBrandHtml(
      title,
      `<p style="color:#CBD5E1;line-height:1.6;">Hi ${escapeHtml(params.customerName)},</p>
       <p style="color:#CBD5E1;line-height:1.6;">We regret to inform you that <strong>${escapeHtml(params.eventTitle)}</strong> (Booking <strong>${escapeHtml(params.bookingReference)}</strong>) has been officially cancelled by the event organiser.</p>
       <p style="color:#CBD5E1;line-height:1.6;"><strong>Official Refund & Next Steps:</strong> ${escapeHtml(params.officialInstructions)}</p>`
    );
    const text = `Match Cancelled: ${params.eventTitle} (Booking ${params.bookingReference})\nOfficial Instructions: ${params.officialInstructions}`;
    return { subject: `Important Notice: ${params.eventTitle} Cancelled`, html, text };
  },

  refundConfirmation(params: {
    customerName: string;
    bookingReference: string;
    refundReference: string;
    amountFormatted: string;
    eventTitle: string;
  }): RenderedEmail {
    const title = `Refund Processed — ${params.refundReference}`;
    const html = wrapBrandHtml(
      title,
      `<p style="color:#CBD5E1;line-height:1.6;">Hi ${escapeHtml(params.customerName)},</p>
       <p style="color:#CBD5E1;line-height:1.6;">Your refund of <strong>${escapeHtml(params.amountFormatted)}</strong> for booking <strong>${escapeHtml(params.bookingReference)}</strong> (${escapeHtml(params.eventTitle)}) has been processed. Depending on your payment method, funds typically reflect within 1–5 business days.</p>`
    );
    const text = `Refund ${params.refundReference} (${params.amountFormatted}) processed for booking ${params.bookingReference} (${params.eventTitle}).`;
    return { subject: `Refund Confirmation: ${params.refundReference}`, html, text };
  },

  supportConfirmation(params: {
    customerName: string;
    ticketReference: string;
    subjectLine: string;
    staffReply?: string;
  }): RenderedEmail {
    const title = params.staffReply
      ? `Support Update — ${params.ticketReference}`
      : `Support Request Received — ${params.ticketReference}`;
    const html = wrapBrandHtml(
      title,
      `<p style="color:#CBD5E1;line-height:1.6;">Hi ${escapeHtml(params.customerName)},</p>
       ${
         params.staffReply
           ? `<p style="color:#CBD5E1;line-height:1.6;">Our support team replied to your request (<strong>${escapeHtml(params.subjectLine)}</strong>):</p>
              <div style="background:#111827;border-left:3px solid #35D399;padding:14px;color:#F8FAFC;line-height:1.6;">${escapeHtml(params.staffReply)}</div>`
           : `<p style="color:#CBD5E1;line-height:1.6;">We received your support request regarding <strong>${escapeHtml(params.subjectLine)}</strong>. Your reference number is <strong>${escapeHtml(params.ticketReference)}</strong>. Our team will respond promptly.</p>`
       }`
    );
    const text = params.staffReply
      ? `Support Update (${params.ticketReference}):\n${params.staffReply}`
      : `Support request received (${params.ticketReference}) regarding "${params.subjectLine}".`;
    return { subject: title, html, text };
  },
};
