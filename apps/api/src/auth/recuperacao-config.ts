export function recuperarSenhaAppUrl(): URL | null {
  if (
    process.env.EMAIL_PROVIDER !== 'resend' ||
    !process.env.RESEND_API_KEY?.trim() ||
    !process.env.EMAIL_FROM?.trim() ||
    !/^[a-f\d]{64}$/i.test(process.env.EMAIL_QUEUE_KEY ?? '')
  ) {
    return null;
  }

  try {
    const url = new URL(process.env.PUBLIC_APP_URL ?? '');
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
      ? url
      : null;
  } catch {
    return null;
  }
}
