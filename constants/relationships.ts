export const RELATIONSHIP_OPTIONS = [
    'Mother',
    'Father',
    'Wife',
    'Husband',
    'Girlfriend',
    'Boyfriend',
    'Fiancée',
    'Fiancé',
    'Sister',
    'Brother',
    'Daughter',
    'Son',
    'Grandmother',
    'Grandfather',
    'Auntie',
    'Uncle',
    'Niece',
    'Nephew',
    'Cousin',
    'Godmother',
    'Godfather',
    'Friend',
    'Colleague',
    'Other'
];

export const getRelationshipColor = (relationship: string) => {
    const rel = relationship?.toLowerCase();

    // Family - Blue
    if ([
        'mother', 'father', 'sister', 'brother', 'daughter', 'son',
        'grandmother', 'grandfather', 'auntie', 'uncle', 'niece', 'nephew', 'cousin'
    ].includes(rel)) {
        return '#60A5FA';
    }

    // Romantic - Pink
    if (['wife', 'husband', 'girlfriend', 'boyfriend', 'fiancée', 'fiancé'].includes(rel)) {
        return '#F472B6';
    }

    // Spiritual/Mentorship - Indigo
    if (['godmother', 'godfather'].includes(rel)) {
        return '#818CF8';
    }

    // Professional - Amber
    if (rel === 'colleague') {
        return '#FBBF24';
    }

    // Social - Green
    if (rel === 'friend') {
        return '#34D399';
    }

    return '#9CA3AF'; // Gray for Other
};
