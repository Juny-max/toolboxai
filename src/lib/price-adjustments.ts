export type PriceAdjustmentProfile = {
  code: string;
  name: string;
  multiplier: number;
  currencyCodes: string[];
  defaultCurrency: string;
  note: string;
};

const GLOBAL_PROFILE: PriceAdjustmentProfile = {
  code: 'GLOBAL',
  name: 'Global Average',
  multiplier: 1,
  currencyCodes: [],
  defaultCurrency: 'USD',
  note: 'No localized pricing data supplied. Using a global baseline for grocery costs.',
};

export const priceAdjustmentProfiles: PriceAdjustmentProfile[] = [
  GLOBAL_PROFILE,
  {
    code: 'US',
    name: 'United States',
    multiplier: 1,
    currencyCodes: ['USD'],
    defaultCurrency: 'USD',
    note: 'Baseline reference market used for most model estimates.',
  },
  {
    code: 'CA',
    name: 'Canada',
    multiplier: 1.15,
    currencyCodes: ['CAD'],
    defaultCurrency: 'CAD',
    note: 'Canadian grocery baskets trend roughly 15% above the U.S. baseline.',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    multiplier: 1.3,
    currencyCodes: ['GBP'],
    defaultCurrency: 'GBP',
    note: 'Average UK supermarket pricing is about 30% higher than the U.S. baseline.',
  },
  {
    code: 'DE',
    name: 'Germany',
    multiplier: 1.25,
    currencyCodes: ['EUR'],
    defaultCurrency: 'EUR',
    note: 'German grocery prices sit roughly 25% above the U.S. baseline costs.',
  },
  {
    code: 'FR',
    name: 'France',
    multiplier: 1.3,
    currencyCodes: ['EUR'],
    defaultCurrency: 'EUR',
    note: 'French supermarket baskets are about 30% higher than the U.S. baseline.',
  },
  {
    code: 'ES',
    name: 'Spain',
    multiplier: 1.2,
    currencyCodes: ['EUR'],
    defaultCurrency: 'EUR',
    note: 'Mediterranean staples trend around 20% above the U.S. baseline.',
  },
  {
    code: 'IT',
    name: 'Italy',
    multiplier: 1.25,
    currencyCodes: ['EUR'],
    defaultCurrency: 'EUR',
    note: 'Italian groceries average roughly 25% higher than the U.S. baseline.',
  },
  {
    code: 'AU',
    name: 'Australia',
    multiplier: 1.3,
    currencyCodes: ['AUD'],
    defaultCurrency: 'AUD',
    note: 'Australian grocery costs trend about 30% above the U.S. baseline.',
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    multiplier: 1.35,
    currencyCodes: ['NZD'],
    defaultCurrency: 'NZD',
    note: 'New Zealand import-heavy groceries trend roughly 35% above the U.S. baseline.',
  },
  {
    code: 'JP',
    name: 'Japan',
    multiplier: 1.4,
    currencyCodes: ['JPY'],
    defaultCurrency: 'JPY',
    note: 'Urban Japanese grocery baskets trend about 40% above the U.S. baseline.',
  },
  {
    code: 'KR',
    name: 'South Korea',
    multiplier: 1.45,
    currencyCodes: ['KRW'],
    defaultCurrency: 'KRW',
    note: 'Korean supermarkets average 45% over the U.S. baseline due to imports.',
  },
  {
    code: 'SG',
    name: 'Singapore',
    multiplier: 1.5,
    currencyCodes: ['SGD'],
    defaultCurrency: 'SGD',
    note: 'Singapore grocery costs can reach 50% above the U.S. baseline.',
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    multiplier: 1.55,
    currencyCodes: ['AED'],
    defaultCurrency: 'AED',
    note: 'High import reliance pushes UAE grocery pricing to roughly 55% above U.S. baseline.',
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    multiplier: 1.4,
    currencyCodes: ['SAR'],
    defaultCurrency: 'SAR',
    note: 'Saudi grocery prices trend about 40% above the U.S. baseline in urban centers.',
  },
  {
    code: 'GH',
    name: 'Ghana',
    multiplier: 2.7,
    currencyCodes: ['GHS'],
    defaultCurrency: 'GHS',
    note: 'Imported produce and staples commonly land 2.5-3x higher than the U.S. baseline.',
  },
  {
    code: 'NG',
    name: 'Nigeria',
    multiplier: 2.1,
    currencyCodes: ['NGN'],
    defaultCurrency: 'NGN',
    note: 'Urban Nigerian supermarkets average roughly twice the U.S. baseline due to supply constraints.',
  },
  {
    code: 'KE',
    name: 'Kenya',
    multiplier: 1.9,
    currencyCodes: ['KES'],
    defaultCurrency: 'KES',
    note: 'Kenyan grocery baskets trend just under twice the U.S. baseline in major cities.',
  },
  {
    code: 'ZA',
    name: 'South Africa',
    multiplier: 1.6,
    currencyCodes: ['ZAR'],
    defaultCurrency: 'ZAR',
    note: 'South African prices are roughly 60% above the U.S. baseline in urban retail chains.',
  },
  {
    code: 'IN',
    name: 'India',
    multiplier: 1.2,
    currencyCodes: ['INR'],
    defaultCurrency: 'INR',
    note: 'Indian home-cooking staples trend about 20% above the U.S. baseline in tier-one cities.',
  },
  {
    code: 'CN',
    name: 'China',
    multiplier: 1.3,
    currencyCodes: ['CNY'],
    defaultCurrency: 'CNY',
    note: 'Chinese tier-one city supermarkets average 30% over the U.S. baseline.',
  },
  {
    code: 'HK',
    name: 'Hong Kong',
    multiplier: 1.8,
    currencyCodes: ['HKD'],
    defaultCurrency: 'HKD',
    note: 'Dense urban import reliance pushes Hong Kong grocery costs to about 80% above U.S. baseline.',
  },
  {
    code: 'BR',
    name: 'Brazil',
    multiplier: 1.35,
    currencyCodes: ['BRL'],
    defaultCurrency: 'BRL',
    note: 'Brazilian supermarket baskets trend around 35% higher than the U.S. baseline.',
  },
  {
    code: 'MX',
    name: 'Mexico',
    multiplier: 1.25,
    currencyCodes: ['MXN'],
    defaultCurrency: 'MXN',
    note: 'Mexican urban groceries are roughly 25% above the U.S. baseline.',
  },
  {
    code: 'AR',
    name: 'Argentina',
    multiplier: 1.5,
    currencyCodes: ['ARS'],
    defaultCurrency: 'ARS',
    note: 'Argentine supermarket costs fluctuate but average 50% above the U.S. baseline in stable months.',
  },
  {
    code: 'CL',
    name: 'Chile',
    multiplier: 1.3,
    currencyCodes: ['CLP'],
    defaultCurrency: 'CLP',
    note: 'Chilean urban groceries trend roughly 30% higher than the U.S. baseline.',
  },
  {
    code: 'CO',
    name: 'Colombia',
    multiplier: 1.25,
    currencyCodes: ['COP'],
    defaultCurrency: 'COP',
    note: 'Colombian supermarkets average about 25% above U.S. baseline pricing.',
  },
  {
    code: 'PE',
    name: 'Peru',
    multiplier: 1.3,
    currencyCodes: ['PEN'],
    defaultCurrency: 'PEN',
    note: 'Peruvian grocery baskets trend around 30% over U.S. baseline pricing.',
  },
  {
    code: 'PH',
    name: 'Philippines',
    multiplier: 1.6,
    currencyCodes: ['PHP'],
    defaultCurrency: 'PHP',
    note: 'Philippine supermarkets in Metro Manila average around 60% above U.S. baseline.',
  },
  {
    code: 'TH',
    name: 'Thailand',
    multiplier: 1.4,
    currencyCodes: ['THB'],
    defaultCurrency: 'THB',
    note: 'Thai urban grocery baskets trend about 40% above the U.S. baseline.',
  },
  {
    code: 'VN',
    name: 'Vietnam',
    multiplier: 1.3,
    currencyCodes: ['VND'],
    defaultCurrency: 'VND',
    note: 'Vietnamese supermarkets average roughly 30% above U.S. baseline costs.',
  },
  {
    code: 'ID',
    name: 'Indonesia',
    multiplier: 1.35,
    currencyCodes: ['IDR'],
    defaultCurrency: 'IDR',
    note: 'Indonesian grocery pricing trends approximately 35% above U.S. baseline in Jakarta.',
  },
  {
    code: 'PK',
    name: 'Pakistan',
    multiplier: 1.4,
    currencyCodes: ['PKR'],
    defaultCurrency: 'PKR',
    note: 'Pakistani urban staples trend around 40% over the U.S. baseline.',
  },
  {
    code: 'BD',
    name: 'Bangladesh',
    multiplier: 1.35,
    currencyCodes: ['BDT'],
    defaultCurrency: 'BDT',
    note: 'Bangladeshi grocery baskets in Dhaka average 35% above U.S. baseline.',
  },
  {
    code: 'EG',
    name: 'Egypt',
    multiplier: 1.85,
    currencyCodes: ['EGP'],
    defaultCurrency: 'EGP',
    note: 'Egyptian supermarkets trend around 85% over the U.S. baseline after subsidies and imports.',
  },
  {
    code: 'MA',
    name: 'Morocco',
    multiplier: 1.5,
    currencyCodes: ['MAD'],
    defaultCurrency: 'MAD',
    note: 'Moroccan groceries trend roughly 50% higher than the U.S. baseline.',
  },
  {
    code: 'TR',
    name: 'Turkey',
    multiplier: 1.7,
    currencyCodes: ['TRY'],
    defaultCurrency: 'TRY',
    note: 'Recent inflation pushes Turkish grocery prices to roughly 70% above U.S. baseline.',
  },
  {
    code: 'RU',
    name: 'Russia',
    multiplier: 1.45,
    currencyCodes: ['RUB'],
    defaultCurrency: 'RUB',
    note: 'Russian supermarket baskets average about 45% above U.S. baseline pricing.',
  },
  {
    code: 'UA',
    name: 'Ukraine',
    multiplier: 1.6,
    currencyCodes: ['UAH'],
    defaultCurrency: 'UAH',
    note: 'Supply-chain shocks push Ukrainian grocery costs roughly 60% over U.S. baseline.',
  },
  {
    code: 'PL',
    name: 'Poland',
    multiplier: 1.35,
    currencyCodes: ['PLN'],
    defaultCurrency: 'PLN',
    note: 'Polish supermarket baskets trend around 35% higher than the U.S. baseline.',
  },
];

const sortedProfiles = [
  GLOBAL_PROFILE,
  ...priceAdjustmentProfiles
    .filter((profile) => profile.code !== 'GLOBAL')
    .sort((a, b) => a.name.localeCompare(b.name)),
];

export const regionOptions = sortedProfiles.map((profile) => ({ ...profile }));

export function getPriceAdjustment(currencyCode: string, regionCode?: string): PriceAdjustmentProfile {
  const normalizedCurrency = currencyCode.toUpperCase();
  const normalizedRegion = regionCode?.toUpperCase();

  if (normalizedRegion) {
    const directMatch = priceAdjustmentProfiles.find((profile) => profile.code === normalizedRegion);
    if (directMatch) {
      return directMatch;
    }
  }

  const currencyMatch = priceAdjustmentProfiles.find((profile) => profile.currencyCodes.includes(normalizedCurrency));
  if (currencyMatch) {
    return currencyMatch;
  }

  return { ...GLOBAL_PROFILE, defaultCurrency: normalizedCurrency };
}
