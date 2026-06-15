const getFirstNonEmptyString = values => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

export const getCompanyLogoUri = (...sources) => {
  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue;
    }

    const resolvedValue = getFirstNonEmptyString([
      source.profileIconUrl,
      source.profile_icon_url,
      source.companyLogoUrl,
      source.company_logo_url,
      source.company_logo,
      source.logoUrl,
      source.logo_url,
      source.logo,
    ]);

    if (resolvedValue) {
      return resolvedValue;
    }
  }

  return null;
};

export const getUserProfilePhotoUri = (...sources) => {
  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue;
    }

    const resolvedValue = getFirstNonEmptyString([
      source.uri,
      source.profilePhotoUrl,
      source.profile_photo_url,
      source.photoUrl,
      source.photo_url,
      source.avatarUrl,
      source.avatar_url,
    ]);

    if (resolvedValue) {
      return resolvedValue;
    }
  }

  return null;
};
