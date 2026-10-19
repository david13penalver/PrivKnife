import DOMPurify from 'dompurify';
import {
  SignatureAvatarShape,
  SignatureConfig,
  SignatureFont,
  SignatureFontSize,
} from './types';

// DOMPurify is exported as an uninitialized factory when loaded in environments without window at import time.
function getPurifier(): { sanitize: (source: string, config?: any) => string } {
  if (DOMPurify && typeof (DOMPurify as any).sanitize === 'function') {
    return DOMPurify as any;
  }
  const win = typeof window !== 'undefined' ? window : (globalThis as any).window;
  if (typeof DOMPurify === 'function' && win) {
    return (DOMPurify as any)(win);
  }
  return {
    sanitize: (str: string) => str.replace(/<[^>]*>?/gm, ''),
  };
}

/**
 * Validates and sanitizes a URL to ensure it doesn't contain dangerous protocols like javascript:
 */
export function sanitizeUrl(url: string | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  const safeProtocolRegex =
    /^(https?:\/\/|mailto:|tel:|data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,)/i;

  if (safeProtocolRegex.test(trimmed)) {
    return getPurifier().sanitize(trimmed, { ALLOWED_TAGS: [] });
  }

  // If user entered just a domain or path without protocol, allow domain-like patterns by prepending https://
  if (/^[a-zA-Z0-9][-a-zA-Z0-9+&@#/%?=~_|!:,.;]*\.[a-zA-Z]{2,}/.test(trimmed)) {
    return getPurifier().sanitize(`https://${trimmed}`, { ALLOWED_TAGS: [] });
  }

  return '';
}

/**
 * Sanitizes plain text fields to neutralize any HTML tags or script injection.
 */
export function sanitizeText(text: string | undefined): string {
  if (!text) return '';
  return getPurifier().sanitize(text, { ALLOWED_TAGS: [] }).trim();
}

/**
 * Sanitizes rich or disclaimer text while stripping dangerous script and event handler attributes.
 */
export function sanitizeRichText(text: string | undefined): string {
  if (!text) return '';
  return getPurifier().sanitize(text, {
    ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'span', 'p', 'br', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'style'],
  }).trim();
}

/**
 * Fully sanitizes a SignatureConfig object.
 */
export function sanitizeSignatureConfig(config: SignatureConfig): SignatureConfig {
  return {
    personal: {
      fullName: sanitizeText(config.personal.fullName),
      jobTitle: sanitizeText(config.personal.jobTitle),
      department: sanitizeText(config.personal.department),
      company: sanitizeText(config.personal.company),
    },
    contact: {
      email: sanitizeText(config.contact.email),
      phone: sanitizeText(config.contact.phone),
      mobile: sanitizeText(config.contact.mobile),
      website: sanitizeUrl(config.contact.website),
      address: sanitizeText(config.contact.address),
    },
    social: {
      linkedin: sanitizeUrl(config.social.linkedin),
      twitter: sanitizeUrl(config.social.twitter),
      github: sanitizeUrl(config.social.github),
      instagram: sanitizeUrl(config.social.instagram),
      facebook: sanitizeUrl(config.social.facebook),
      youtube: sanitizeUrl(config.social.youtube),
    },
    images: {
      avatarUrl: sanitizeUrl(config.images.avatarUrl),
      avatarShape: config.images.avatarShape,
      avatarSize: Number(config.images.avatarSize) || 80,
      logoUrl: sanitizeUrl(config.images.logoUrl),
      logoSize: Number(config.images.logoSize) || 40,
    },
    style: {
      template: config.style.template,
      primaryColor: sanitizeText(config.style.primaryColor) || '#2563eb',
      secondaryColor: sanitizeText(config.style.secondaryColor) || '#4b5563',
      textColor: sanitizeText(config.style.textColor) || '#1f2937',
      fontFamily: config.style.fontFamily,
      fontSize: config.style.fontSize,
      disclaimerText: sanitizeRichText(config.style.disclaimerText),
      includeBranding: Boolean(config.style.includeBranding),
    },
  };
}

function getAvatarBorderRadius(shape: SignatureAvatarShape): string {
  switch (shape) {
    case 'round':
      return '50%';
    case 'rounded':
      return '8px';
    case 'square':
    default:
      return '0px';
  }
}

interface FontScale {
  base: number;
  name: number;
  title: number;
  contact: number;
  disclaimer: number;
}

function getFontScale(size: SignatureFontSize): FontScale {
  switch (size) {
    case 'sm':
      return { base: 12, name: 14, title: 12, contact: 11, disclaimer: 10 };
    case 'lg':
      return { base: 16, name: 18, title: 16, contact: 13, disclaimer: 12 };
    case 'md':
    default:
      return { base: 14, name: 16, title: 14, contact: 12, disclaimer: 11 };
  }
}

function renderSocialBadges(social: SignatureConfig['social'], primaryColor: string): string {
  const links: { label: string; url: string }[] = [];
  if (social.linkedin) links.push({ label: 'LinkedIn', url: social.linkedin });
  if (social.twitter) links.push({ label: 'X', url: social.twitter });
  if (social.github) links.push({ label: 'GitHub', url: social.github });
  if (social.instagram) links.push({ label: 'Instagram', url: social.instagram });
  if (social.facebook) links.push({ label: 'Facebook', url: social.facebook });
  if (social.youtube) links.push({ label: 'YouTube', url: social.youtube });

  if (links.length === 0) return '';

  const badges = links
    .map(
      (l) =>
        `<a href="${l.url}" target="_blank" style="display: inline-block; padding: 2px 7px; margin-right: 4px; margin-bottom: 4px; font-size: 11px; font-weight: 600; color: ${primaryColor}; text-decoration: none; border: 1px solid ${primaryColor}; border-radius: 4px; line-height: 14px;">${l.label}</a>`
    )
    .join('');

  return `<div style="margin-top: 8px;">${badges}</div>`;
}

function renderBrandingRow(includeBranding: boolean, fontFamily: SignatureFont): string {
  if (!includeBranding) return '';
  return `<tr><td colspan="3" style="padding-top: 10px; font-family: ${fontFamily}; font-size: 10px; color: #9ca3af;"><span style="color: #9ca3af;">Created with </span><a href="https://privknife.com" target="_blank" style="color: #9ca3af; text-decoration: underline;">PrivKnife</a></td></tr>`;
}

/**
 * Builds Modern Template HTML
 */
function buildModernTemplate(config: SignatureConfig, scale: FontScale): string {
  const { personal, contact, social, images, style } = config;
  const radius = getAvatarBorderRadius(images.avatarShape);

  const hasAvatar = Boolean(images.avatarUrl);
  const avatarCell = hasAvatar
    ? `<td style="vertical-align: top; padding-right: 16px;">
        <img src="${images.avatarUrl}" alt="${personal.fullName}" width="${images.avatarSize}" height="${images.avatarSize}" style="display: block; width: ${images.avatarSize}px; height: ${images.avatarSize}px; border-radius: ${radius}; object-fit: cover; border: 0;" />
       </td>`
    : '';

  const contactItems: string[] = [];
  if (contact.email) {
    contactItems.push(
      `<span style="margin-right: 12px;"><a href="mailto:${contact.email}" style="color: ${style.textColor}; text-decoration: none;">✉️ ${contact.email}</a></span>`
    );
  }
  if (contact.phone) {
    contactItems.push(
      `<span style="margin-right: 12px;"><a href="tel:${contact.phone.replace(/[^0-9+]/g, '')}" style="color: ${style.textColor}; text-decoration: none;">📞 ${contact.phone}</a></span>`
    );
  }
  if (contact.mobile) {
    contactItems.push(
      `<span style="margin-right: 12px;"><a href="tel:${contact.mobile.replace(/[^0-9+]/g, '')}" style="color: ${style.textColor}; text-decoration: none;">📱 ${contact.mobile}</a></span>`
    );
  }
  if (contact.website) {
    contactItems.push(
      `<span style="margin-right: 12px;"><a href="${contact.website}" target="_blank" style="color: ${style.primaryColor}; text-decoration: none;">🌐 ${contact.website.replace(/^https?:\/\//, '')}</a></span>`
    );
  }
  if (contact.address) {
    contactItems.push(
      `<span style="color: ${style.secondaryColor};">📍 ${contact.address}</span>`
    );
  }

  const socialHtml = renderSocialBadges(social, style.primaryColor);
  const brandingHtml = renderBrandingRow(style.includeBranding, style.fontFamily);

  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; font-family: ${style.fontFamily}; font-size: ${scale.base}px; color: ${style.textColor}; line-height: 1.4;">
  <tbody>
    <tr>
      ${avatarCell}
      <td style="vertical-align: top; border-left: 3px solid ${style.primaryColor}; padding-left: 14px;">
        <table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="font-size: ${scale.name}px; font-weight: bold; color: ${style.primaryColor}; line-height: 1.2;">${personal.fullName}</td>
            </tr>
            <tr>
              <td style="font-size: ${scale.title}px; color: ${style.secondaryColor}; padding-top: 2px; padding-bottom: 6px;">
                ${personal.jobTitle}${personal.company ? ` • <strong style="color: ${style.textColor};">${personal.company}</strong>` : ''}${personal.department ? ` (${personal.department})` : ''}
              </td>
            </tr>
            ${
              contactItems.length > 0
                ? `<tr><td style="font-size: ${scale.contact}px; color: ${style.textColor}; padding-top: 4px; line-height: 1.5;">${contactItems.join('')}</td></tr>`
                : ''
            }
            ${
              socialHtml
                ? `<tr><td style="padding-top: 4px;">${socialHtml}</td></tr>`
                : ''
            }
          </tbody>
        </table>
      </td>
    </tr>
    ${brandingHtml}
  </tbody>
</table>`;
}

/**
 * Builds Compact Template HTML
 */
function buildCompactTemplate(config: SignatureConfig, scale: FontScale): string {
  const { personal, contact, social, images, style } = config;
  const radius = getAvatarBorderRadius(images.avatarShape);

  const avatarTag = images.avatarUrl
    ? `<img src="${images.avatarUrl}" alt="${personal.fullName}" width="${Math.min(images.avatarSize, 48)}" height="${Math.min(images.avatarSize, 48)}" style="display: inline-block; vertical-align: middle; width: ${Math.min(images.avatarSize, 48)}px; height: ${Math.min(images.avatarSize, 48)}px; border-radius: ${radius}; margin-right: 8px; border: 0;" />`
    : '';

  const contactList: string[] = [];
  if (contact.email) {
    contactList.push(
      `<a href="mailto:${contact.email}" style="color: ${style.primaryColor}; text-decoration: none;">${contact.email}</a>`
    );
  }
  if (contact.phone) {
    contactList.push(
      `<a href="tel:${contact.phone.replace(/[^0-9+]/g, '')}" style="color: ${style.textColor}; text-decoration: none;">${contact.phone}</a>`
    );
  }
  if (contact.website) {
    contactList.push(
      `<a href="${contact.website}" target="_blank" style="color: ${style.primaryColor}; text-decoration: none;">${contact.website.replace(/^https?:\/\//, '')}</a>`
    );
  }

  const socialLinks: string[] = [];
  if (social.linkedin) {
    socialLinks.push(
      `<a href="${social.linkedin}" target="_blank" style="color: ${style.secondaryColor}; text-decoration: none; font-weight: 600;">LinkedIn</a>`
    );
  }
  if (social.twitter) {
    socialLinks.push(
      `<a href="${social.twitter}" target="_blank" style="color: ${style.secondaryColor}; text-decoration: none; font-weight: 600;">X</a>`
    );
  }
  if (social.github) {
    socialLinks.push(
      `<a href="${social.github}" target="_blank" style="color: ${style.secondaryColor}; text-decoration: none; font-weight: 600;">GitHub</a>`
    );
  }

  const allItems = [...contactList, ...socialLinks].join(' | ');
  const brandingHtml = renderBrandingRow(style.includeBranding, style.fontFamily);

  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; font-family: ${style.fontFamily}; font-size: ${scale.base}px; color: ${style.textColor}; line-height: 1.3;">
  <tbody>
    <tr>
      <td style="padding-bottom: 2px;">
        ${avatarTag}<strong style="color: ${style.primaryColor}; font-size: ${scale.name}px;">${personal.fullName}</strong>
        ${personal.jobTitle ? `<span style="color: ${style.secondaryColor};"> — ${personal.jobTitle}</span>` : ''}
        ${personal.company ? `<span style="color: ${style.textColor}; font-weight: 600;"> @ ${personal.company}</span>` : ''}
      </td>
    </tr>
    ${
      allItems
        ? `<tr><td style="font-size: ${scale.contact}px; color: ${style.secondaryColor}; padding-top: 2px;">${allItems}</td></tr>`
        : ''
    }
    ${brandingHtml}
  </tbody>
</table>`;
}

/**
 * Builds Corporate Template HTML
 */
function buildCorporateTemplate(config: SignatureConfig, scale: FontScale): string {
  const { personal, contact, social, images, style } = config;
  const radius = getAvatarBorderRadius(images.avatarShape);

  const logoRow = images.logoUrl
    ? `<tr>
        <td colspan="2" style="padding-bottom: 8px;">
          <img src="${images.logoUrl}" alt="${personal.company || 'Logo'}" height="${images.logoSize}" style="display: block; height: ${images.logoSize}px; width: auto; max-width: 180px; border: 0;" />
        </td>
       </tr>`
    : '';

  const hasAvatar = Boolean(images.avatarUrl);
  const avatarCell = hasAvatar
    ? `<td style="vertical-align: top; padding-right: 14px; width: ${images.avatarSize}px;">
        <img src="${images.avatarUrl}" alt="${personal.fullName}" width="${images.avatarSize}" height="${images.avatarSize}" style="display: block; width: ${images.avatarSize}px; height: ${images.avatarSize}px; border-radius: ${radius}; object-fit: cover; border: 0;" />
       </td>`
    : '';

  const contactLines: string[] = [];
  if (contact.email) {
    contactLines.push(
      `Email: <a href="mailto:${contact.email}" style="color: ${style.primaryColor}; text-decoration: none;">${contact.email}</a>`
    );
  }
  if (contact.phone) {
    contactLines.push(
      `Tel: <a href="tel:${contact.phone.replace(/[^0-9+]/g, '')}" style="color: ${style.textColor}; text-decoration: none;">${contact.phone}</a>`
    );
  }
  if (contact.mobile) {
    contactLines.push(
      `Mobile: <a href="tel:${contact.mobile.replace(/[^0-9+]/g, '')}" style="color: ${style.textColor}; text-decoration: none;">${contact.mobile}</a>`
    );
  }
  if (contact.website) {
    contactLines.push(
      `Web: <a href="${contact.website}" target="_blank" style="color: ${style.primaryColor}; text-decoration: none;">${contact.website.replace(/^https?:\/\//, '')}</a>`
    );
  }
  if (contact.address) {
    contactLines.push(`Office: ${contact.address}`);
  }

  const socialHtml = renderSocialBadges(social, style.primaryColor);
  const disclaimerRow = style.disclaimerText
    ? `<tr>
        <td colspan="2" style="padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: ${scale.disclaimer}px; color: #64748b; line-height: 1.35; font-style: italic;">
          ${style.disclaimerText}
        </td>
       </tr>`
    : '';

  const brandingHtml = renderBrandingRow(style.includeBranding, style.fontFamily);

  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; font-family: ${style.fontFamily}; font-size: ${scale.base}px; color: ${style.textColor}; line-height: 1.4; max-width: 550px;">
  <tbody>
    ${logoRow}
    <tr>
      ${avatarCell}
      <td style="vertical-align: top;">
        <table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="font-size: ${scale.name}px; font-weight: bold; color: ${style.primaryColor};">${personal.fullName}</td>
            </tr>
            <tr>
              <td style="font-size: ${scale.title}px; color: ${style.secondaryColor}; padding-bottom: 6px; border-bottom: 2px solid ${style.primaryColor};">
                ${personal.jobTitle}${personal.company ? ` | <strong>${personal.company}</strong>` : ''}${personal.department ? ` • ${personal.department}` : ''}
              </td>
            </tr>
            ${
              contactLines.length > 0
                ? `<tr><td style="font-size: ${scale.contact}px; color: ${style.textColor}; padding-top: 6px; line-height: 1.5;">${contactLines.join('<br />')}</td></tr>`
                : ''
            }
            ${
              socialHtml
                ? `<tr><td style="padding-top: 4px;">${socialHtml}</td></tr>`
                : ''
            }
          </tbody>
        </table>
      </td>
    </tr>
    ${disclaimerRow}
    ${brandingHtml}
  </tbody>
</table>`;
}

/**
 * Builds Minimal Template HTML
 */
function buildMinimalTemplate(config: SignatureConfig, scale: FontScale): string {
  const { personal, contact, social, images, style } = config;
  const radius = getAvatarBorderRadius(images.avatarShape);

  const avatarTag = images.avatarUrl
    ? `<div style="padding-bottom: 8px;"><img src="${images.avatarUrl}" alt="${personal.fullName}" width="${images.avatarSize}" height="${images.avatarSize}" style="display: block; width: ${images.avatarSize}px; height: ${images.avatarSize}px; border-radius: ${radius}; border: 0;" /></div>`
    : '';

  const contactItems: string[] = [];
  if (contact.email) {
    contactItems.push(
      `<a href="mailto:${contact.email}" style="color: ${style.primaryColor}; text-decoration: none;">${contact.email}</a>`
    );
  }
  if (contact.phone || contact.mobile) {
    const p = contact.phone || contact.mobile;
    contactItems.push(
      `<a href="tel:${p.replace(/[^0-9+]/g, '')}" style="color: ${style.textColor}; text-decoration: none;">${p}</a>`
    );
  }
  if (contact.website) {
    contactItems.push(
      `<a href="${contact.website}" target="_blank" style="color: ${style.primaryColor}; text-decoration: none;">${contact.website.replace(/^https?:\/\//, '')}</a>`
    );
  }
  if (contact.address) {
    contactItems.push(`<span>${contact.address}</span>`);
  }

  const socialLinks: string[] = [];
  if (social.linkedin) {
    socialLinks.push(
      `<a href="${social.linkedin}" target="_blank" style="color: ${style.secondaryColor}; text-decoration: none;">LinkedIn</a>`
    );
  }
  if (social.twitter) {
    socialLinks.push(
      `<a href="${social.twitter}" target="_blank" style="color: ${style.secondaryColor}; text-decoration: none;">X</a>`
    );
  }
  if (social.github) {
    socialLinks.push(
      `<a href="${social.github}" target="_blank" style="color: ${style.secondaryColor}; text-decoration: none;">GitHub</a>`
    );
  }

  const brandingHtml = renderBrandingRow(style.includeBranding, style.fontFamily);

  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; font-family: ${style.fontFamily}; font-size: ${scale.base}px; color: ${style.textColor}; line-height: 1.4;">
  <tbody>
    <tr>
      <td>
        ${avatarTag}
        <div style="font-size: ${scale.name}px; font-weight: bold; color: ${style.primaryColor};">${personal.fullName}</div>
        <div style="font-size: ${scale.title}px; color: ${style.secondaryColor}; padding-top: 1px;">
          ${personal.jobTitle}${personal.company ? ` / ${personal.company}` : ''}
        </div>
        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: ${scale.contact}px;">
          ${contactItems.join(' • ')}
        </div>
        ${
          socialLinks.length > 0
            ? `<div style="font-size: 11px; color: ${style.secondaryColor}; margin-top: 4px;">${socialLinks.join(' / ')}</div>`
            : ''
        }
      </td>
    </tr>
    ${brandingHtml}
  </tbody>
</table>`;
}

/**
 * Builds Two-Column Template HTML
 */
function buildTwoColumnTemplate(config: SignatureConfig, scale: FontScale): string {
  const { personal, contact, social, images, style } = config;
  const radius = getAvatarBorderRadius(images.avatarShape);

  const leftColItems: string[] = [];
  if (images.avatarUrl) {
    leftColItems.push(
      `<img src="${images.avatarUrl}" alt="${personal.fullName}" width="${images.avatarSize}" height="${images.avatarSize}" style="display: block; width: ${images.avatarSize}px; height: ${images.avatarSize}px; border-radius: ${radius}; object-fit: cover; border: 0; margin-bottom: 6px;" />`
    );
  }
  if (images.logoUrl) {
    leftColItems.push(
      `<img src="${images.logoUrl}" alt="${personal.company || 'Logo'}" height="${images.logoSize}" style="display: block; height: ${images.logoSize}px; width: auto; border: 0;" />`
    );
  }

  const leftColumn =
    leftColItems.length > 0
      ? `<td style="vertical-align: top; padding-right: 18px; text-align: center; border-right: 1px solid #e2e8f0;">
          ${leftColItems.join('')}
         </td>`
      : '';

  const contactList: string[] = [];
  if (contact.email) {
    contactList.push(
      `<tr><td style="font-size: ${scale.contact}px; padding-bottom: 2px;">✉️ <a href="mailto:${contact.email}" style="color: ${style.primaryColor}; text-decoration: none;">${contact.email}</a></td></tr>`
    );
  }
  if (contact.phone) {
    contactList.push(
      `<tr><td style="font-size: ${scale.contact}px; padding-bottom: 2px;">📞 <a href="tel:${contact.phone.replace(/[^0-9+]/g, '')}" style="color: ${style.textColor}; text-decoration: none;">${contact.phone}</a></td></tr>`
    );
  }
  if (contact.mobile) {
    contactList.push(
      `<tr><td style="font-size: ${scale.contact}px; padding-bottom: 2px;">📱 <a href="tel:${contact.mobile.replace(/[^0-9+]/g, '')}" style="color: ${style.textColor}; text-decoration: none;">${contact.mobile}</a></td></tr>`
    );
  }
  if (contact.website) {
    contactList.push(
      `<tr><td style="font-size: ${scale.contact}px; padding-bottom: 2px;">🌐 <a href="${contact.website}" target="_blank" style="color: ${style.primaryColor}; text-decoration: none;">${contact.website.replace(/^https?:\/\//, '')}</a></td></tr>`
    );
  }
  if (contact.address) {
    contactList.push(
      `<tr><td style="font-size: ${scale.contact}px; color: ${style.secondaryColor}; padding-bottom: 2px;">📍 ${contact.address}</td></tr>`
    );
  }

  const socialHtml = renderSocialBadges(social, style.primaryColor);
  const brandingHtml = renderBrandingRow(style.includeBranding, style.fontFamily);

  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; font-family: ${style.fontFamily}; font-size: ${scale.base}px; color: ${style.textColor}; line-height: 1.4;">
  <tbody>
    <tr>
      ${leftColumn}
      <td style="vertical-align: top; padding-left: ${leftColItems.length > 0 ? '18px' : '0'};">
        <table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="font-size: ${scale.name}px; font-weight: bold; color: ${style.primaryColor};">${personal.fullName}</td>
            </tr>
            <tr>
              <td style="font-size: ${scale.title}px; color: ${style.secondaryColor}; padding-bottom: 4px;">
                ${personal.jobTitle}${personal.company ? ` at <strong>${personal.company}</strong>` : ''}${personal.department ? ` (${personal.department})` : ''}
              </td>
            </tr>
            ${contactList.join('')}
            ${
              socialHtml
                ? `<tr><td style="padding-top: 4px;">${socialHtml}</td></tr>`
                : ''
            }
          </tbody>
        </table>
      </td>
    </tr>
    ${brandingHtml}
  </tbody>
</table>`;
}

/**
 * Generates email-client compliant HTML table signature based on configured template.
 */
export function generateSignatureHtml(rawConfig: SignatureConfig): string {
  const config = sanitizeSignatureConfig(rawConfig);
  const scale = getFontScale(config.style.fontSize);

  switch (config.style.template) {
    case 'compact':
      return buildCompactTemplate(config, scale);
    case 'corporate':
      return buildCorporateTemplate(config, scale);
    case 'minimal':
      return buildMinimalTemplate(config, scale);
    case 'two-column':
      return buildTwoColumnTemplate(config, scale);
    case 'modern':
    default:
      return buildModernTemplate(config, scale);
  }
}

/**
 * Generates plain text ASCII representation for text-only email clients and rich-text fallback.
 */
export function generatePlainTextSignature(rawConfig: SignatureConfig): string {
  const config = sanitizeSignatureConfig(rawConfig);
  const { personal, contact, social, style } = config;

  const lines: string[] = [];

  // Personal
  lines.push(personal.fullName);
  const titleParts = [personal.jobTitle];
  if (personal.company) titleParts.push(personal.company);
  if (titleParts.length > 0) lines.push(titleParts.join(' | '));
  if (personal.department) lines.push(personal.department);

  lines.push('----------------------------------------');

  // Contact
  if (contact.email) lines.push(`Email: ${contact.email}`);
  if (contact.phone) lines.push(`Phone: ${contact.phone}`);
  if (contact.mobile) lines.push(`Mobile: ${contact.mobile}`);
  if (contact.website) lines.push(`Website: ${contact.website}`);
  if (contact.address) lines.push(`Address: ${contact.address}`);

  // Social
  const socialEntries: string[] = [];
  if (social.linkedin) socialEntries.push(`LinkedIn: ${social.linkedin}`);
  if (social.twitter) socialEntries.push(`X: ${social.twitter}`);
  if (social.github) socialEntries.push(`GitHub: ${social.github}`);
  if (social.instagram) socialEntries.push(`Instagram: ${social.instagram}`);
  if (social.facebook) socialEntries.push(`Facebook: ${social.facebook}`);
  if (social.youtube) socialEntries.push(`YouTube: ${social.youtube}`);

  if (socialEntries.length > 0) {
    lines.push('');
    lines.push(...socialEntries);
  }

  if (style.disclaimerText) {
    lines.push('');
    lines.push(style.disclaimerText);
  }

  if (style.includeBranding) {
    lines.push('');
    lines.push('Created with PrivKnife (https://privknife.com)');
  }

  return lines.join('\n');
}

/**
 * Exports HTML string as text/html Blob for file download.
 */
export function exportSignatureHtmlBlob(htmlContent: string): Blob {
  return new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
}
