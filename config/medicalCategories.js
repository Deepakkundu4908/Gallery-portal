const MEDICAL_CATEGORIES = [
  'Radiology',
  'Lab Reports',
  'Prescriptions',
  'Clinical Notes',
  'Discharge Summaries',
  'Insurance',
  'General Records'
];

const normalizeCategory = (value) => {
  const selected = String(value || '').trim();
  if (MEDICAL_CATEGORIES.includes(selected)) {
    return selected;
  }
  return 'General Records';
};

module.exports = {
  MEDICAL_CATEGORIES,
  normalizeCategory
};
