import { 
  RawMaterial, 
  MachineOperatingSpeedMode, 
  Yuemei25HeadFrameCalculation, 
  YuemeiFrameMaterialEstimate,
  TaskMaterialInput 
} from '../types';

export interface StandardMachineInputSlot {
  slotNumber: number;
  slotKey: string;
  name: string;
  shortLabel: string;
  role: string;
  description: string;
  isBeadInput: boolean;
  beadDeviceNumber?: number;
  category: string;
  defaultUnit: string;
  suggestedUnits: string[];
  suggestedSizes: string[];
  suggestedColors: { name: string; hex: string }[];
  defaultCodePrefix: string;
  sampleName: string;
  defaultThreshold: number;
  defaultStock: number;
  defaultBurnRate: number;
  defaultUnitCost: number;
}

export const STANDARD_MACHINE_INPUTS_10: StandardMachineInputSlot[] = [
  {
    slotNumber: 1,
    slotKey: 'base_fabric',
    name: 'Base Fabric (Ground Cloth)',
    shortLabel: 'Base Fabric',
    role: 'Primary substrate clamped on frame',
    description: 'The base material clamped on the frame (e.g., Net, Organza, Georgette, Velvet, Silk, or Satin).',
    isBeadInput: false,
    category: 'Base Fabric (Ground Cloth)',
    defaultUnit: 'meters',
    suggestedUnits: ['meters', 'yards', 'rolls', 'kg'],
    suggestedSizes: ['44" Width', '54" Width', '60" Width', 'Georgette 60 GSM', 'Micro Net', 'Raw Silk 100 GSM', 'Velvet 9000', 'Organza Sheer'],
    suggestedColors: [
      { name: 'Pure White', hex: '#FFFFFF' },
      { name: 'Jet Black', hex: '#1E293B' },
      { name: 'Champagne Beige', hex: '#F5E6D3' },
      { name: 'Royal Navy', hex: '#1E3A8A' },
      { name: 'Crimson Maroon', hex: '#881337' },
      { name: 'Emerald Green', hex: '#065F46' },
      { name: 'Dusty Rose', hex: '#BE185D' },
      { name: 'Golden Mustard', hex: '#D97706' }
    ],
    defaultCodePrefix: 'FAB',
    sampleName: 'Nylon Sheer Micro Net Base Fabric',
    defaultThreshold: 500,
    defaultStock: 2500,
    defaultBurnRate: 60,
    defaultUnitCost: 45.0
  },
  {
    slotNumber: 2,
    slotKey: 'backing_paper',
    name: 'Backing Paper / Stabilizer',
    shortLabel: 'Stabilizer / Paper',
    role: 'Non-woven backing loaded underneath',
    description: 'Non-woven backing (Tearaway paper, Cutaway, or water-soluble PVA film for sheer fabrics) to prevent puckering.',
    isBeadInput: false,
    category: 'Backing Paper / Stabilizer',
    defaultUnit: 'meters',
    suggestedUnits: ['meters', 'rolls', 'kg', 'yards'],
    suggestedSizes: ['40 GSM Tearaway', '60 GSM Tearaway', '80 GSM Heavy Cutaway', 'Water-Soluble PVA Film 35u', 'Heat-Away Film'],
    suggestedColors: [
      { name: 'Standard White', hex: '#F8FAFC' },
      { name: 'Translucent PVA', hex: '#E2E8F0' },
      { name: 'Black Backing', hex: '#334155' }
    ],
    defaultCodePrefix: 'STB',
    sampleName: 'Non-Woven Tearaway Embroidery Paper 50 GSM',
    defaultThreshold: 800,
    defaultStock: 4000,
    defaultBurnRate: 65,
    defaultUnitCost: 8.5
  },
  {
    slotNumber: 3,
    slotKey: 'bead_device_1',
    name: 'Bead Device 1: Cutdana / Tube Beads',
    shortLabel: 'Bead 1: Cutdana',
    role: 'Feeder Cassette 1',
    description: 'Glass cutdana/bugle beads loaded on reel cassettes or feeder cups.',
    isBeadInput: true,
    beadDeviceNumber: 1,
    category: 'Bead Device 1 (Cutdana / Tube)',
    defaultUnit: 'packets',
    suggestedUnits: ['packets', 'grams', 'kg', 'gross', 'strands', 'pcs', 'boxes'],
    suggestedSizes: ['2 Cut (1.8 mm)', '3 Cut (2.5 mm)', '4 Cut (3.2 mm)', 'Bugle 6 mm', 'Hex Cutdana 2 Cut'],
    suggestedColors: [
      { name: 'Metallic Antique Gold', hex: '#D97706' },
      { name: 'Silver Sheen', hex: '#94A3B8' },
      { name: 'Rose Gold', hex: '#F43F5E' },
      { name: 'Jet Black Gloss', hex: '#0F172A' },
      { name: 'Copper Bronze', hex: '#B45309' },
      { name: 'Emerald Luster', hex: '#059669' },
      { name: 'Ruby Wine', hex: '#DC2626' },
      { name: 'Royal Sapphire', hex: '#2563EB' }
    ],
    defaultCodePrefix: 'CUT',
    sampleName: '2-Cut Metallic Antique Gold Glass Cutdana',
    defaultThreshold: 100,
    defaultStock: 600,
    defaultBurnRate: 25,
    defaultUnitCost: 120.0
  },
  {
    slotNumber: 4,
    slotKey: 'bead_device_2',
    name: 'Bead Device 2: Round Glass / Seed Beads',
    shortLabel: 'Bead 2: Seed Beads',
    role: 'Feeder Cassette 2',
    description: '2 mm to 3 mm round pearl or seed beads fed via a second cassette/cup.',
    isBeadInput: true,
    beadDeviceNumber: 2,
    category: 'Bead Device 2 (Round Glass / Seed)',
    defaultUnit: 'packets',
    suggestedUnits: ['packets', 'grams', 'kg', 'gross', 'strands', 'pcs', 'boxes'],
    suggestedSizes: ['2.0 mm (#11/0)', '2.5 mm (#9/0)', '3.0 mm (#8/0)', 'Micro Seed 1.5 mm'],
    suggestedColors: [
      { name: 'Crystal AB Rainbow', hex: '#E0E7FF' },
      { name: 'Pearl Ivory White', hex: '#FFFBEB' },
      { name: 'Metallic Gold Luster', hex: '#F59E0B' },
      { name: 'Metallic Gunmetal', hex: '#475569' },
      { name: 'Ruby Red Transparent', hex: '#DC2626' },
      { name: 'Cobalt Blue', hex: '#1D4ED8' }
    ],
    defaultCodePrefix: 'SED',
    sampleName: '2.5mm Round Glass Seed Beads #9/0',
    defaultThreshold: 120,
    defaultStock: 750,
    defaultBurnRate: 30,
    defaultUnitCost: 95.0
  },
  {
    slotNumber: 5,
    slotKey: 'bead_device_3',
    name: 'Bead Device 3: Moti / Pearl Beads',
    shortLabel: 'Bead 3: Moti/Pearl',
    role: 'Feeder Cassette 3',
    description: 'Metallic beads, pearl beads, or secondary size beads.',
    isBeadInput: true,
    beadDeviceNumber: 3,
    category: 'Bead Device 3 (Moti / Pearl Beads)',
    defaultUnit: 'packets',
    suggestedUnits: ['packets', 'gross', 'strands', 'pcs', 'grams', 'kg', 'boxes'],
    suggestedSizes: ['3.0 mm Moti', '4.0 mm Pearl', '5.0 mm Round Pearl', '6.0 mm Drop Pearl', 'Faceted Acrylic 4 mm'],
    suggestedColors: [
      { name: 'Natural Pearl Cream', hex: '#FEF3C7' },
      { name: 'Pure White Pearl', hex: '#F8FAFC' },
      { name: 'Champagne Gold Moti', hex: '#FBBF24' },
      { name: 'Rose Tinted Pearl', hex: '#FBCFE8' },
      { name: 'Silver Metallic Bead', hex: '#CBD5E1' }
    ],
    defaultCodePrefix: 'MOT',
    sampleName: '4.0mm High-Luster Ivory Pearl Moti Beads',
    defaultThreshold: 80,
    defaultStock: 500,
    defaultBurnRate: 20,
    defaultUnitCost: 140.0
  },
  {
    slotNumber: 6,
    slotKey: 'bead_device_4',
    name: 'Bead Device 4: Sequins / Sitara / Stars',
    shortLabel: 'Bead 4: Sequins/Sitara',
    role: 'Feeder Cassette 4 (Twin Sequin / Feeder)',
    description: 'Flat, cup, or holographic sequins (3 mm, 5 mm, 7 mm) fed through the side twin-sequin or bead-feeder system.',
    isBeadInput: true,
    beadDeviceNumber: 4,
    category: 'Bead Device 4 (Sequins / Sitara)',
    defaultUnit: 'rolls',
    suggestedUnits: ['rolls', 'packets', 'meters', 'grams', 'gross', 'pcs'],
    suggestedSizes: ['3 mm Flat Sequin', '5 mm Flat Sitara', '7 mm Flat Reel', '9 mm Jumbo Sequin', 'Square 4 mm Sitara'],
    suggestedColors: [
      { name: 'Gloss Antique Gold', hex: '#EAB308' },
      { name: 'Silver Mirror Foil', hex: '#E2E8F0' },
      { name: 'Holographic Rainbow', hex: '#A7F3D0' },
      { name: 'Matte Rose Gold', hex: '#FDA4AF' },
      { name: 'Emerald Sparkle', hex: '#10B981' },
      { name: 'Jet Black Luster', hex: '#0F172A' }
    ],
    defaultCodePrefix: 'SEQ',
    sampleName: '5mm Flat Gloss Antique Gold Reel Sequins',
    defaultThreshold: 50,
    defaultStock: 300,
    defaultBurnRate: 15,
    defaultUnitCost: 180.0
  },
  {
    slotNumber: 7,
    slotKey: 'lace_ribbon',
    name: 'Lace / Base Border Ribbon',
    shortLabel: 'Lace / Border Ribbon',
    role: 'Applied border ribbon / tape strip',
    description: 'Applied tape, ribbon, or border strip if running continuous lace or multi-strip patch borders.',
    isBeadInput: false,
    category: 'Lace & Border Ribbons',
    defaultUnit: 'meters',
    suggestedUnits: ['meters', 'yards', 'rolls', 'spools'],
    suggestedSizes: ['15 mm Satin Ribbon', '25 mm Velvet Border', '40 mm Base Lace Strip', '10 mm Appliqué Tape', '50 mm Border Trim'],
    suggestedColors: [
      { name: 'Antique Gold Trim', hex: '#CA8A04' },
      { name: 'Burgundy Red', hex: '#991B1B' },
      { name: 'Ivory White', hex: '#FFFBEB' },
      { name: 'Royal Navy Blue', hex: '#1E3A8A' },
      { name: 'Forest Green', hex: '#166534' }
    ],
    defaultCodePrefix: 'LCE',
    sampleName: '25mm Double-Edge Satin Border Ribbon',
    defaultThreshold: 300,
    defaultStock: 1800,
    defaultBurnRate: 40,
    defaultUnitCost: 16.0
  },
  {
    slotNumber: 8,
    slotKey: 'top_threads',
    name: 'Top Embroidery Thread (Needle Threads / Zari)',
    shortLabel: 'Top Threads (Zari/Color)',
    role: 'Needle bars (12-15 cones per head)',
    description: 'Spools of Viscose, Polyester, or Metallic Zari (e.g., Badla/Kasab) thread loaded across all needle bars (12 to 15 cones per head).',
    isBeadInput: false,
    category: 'Top Needle Threads (Zari & Colors)',
    defaultUnit: 'cones',
    suggestedUnits: ['cones', 'spools', 'meters', 'boxes'],
    suggestedSizes: ['Kasab Zari #30', 'Badla Metallic #40', '120D/2 Viscose Rayon', '150D/2 Polyester Cone', 'Tri-Lobal Poly 40 Tex'],
    suggestedColors: [
      { name: 'Golden Metallic Kasab', hex: '#F59E0B' },
      { name: 'Silver Metallic Badla', hex: '#94A3B8' },
      { name: 'Copper Antique Zari', hex: '#B45309' },
      { name: 'Crimson Viscose', hex: '#DC2626' },
      { name: 'Emerald Rayon', hex: '#059669' },
      { name: 'Midnight Black', hex: '#020617' },
      { name: 'Ivory Lustrous White', hex: '#F8FAFC' }
    ],
    defaultCodePrefix: 'ZAR',
    sampleName: 'Kasab Metallic Zari #30 Top Needle Cone (5000m)',
    defaultThreshold: 40,
    defaultStock: 250,
    defaultBurnRate: 8,
    defaultUnitCost: 165.0
  },
  {
    slotNumber: 9,
    slotKey: 'bobbin_thread',
    name: 'Bobbin / Bottom Thread',
    shortLabel: 'Bobbin / Underthread',
    role: 'Rotary hook bobbins underframe',
    description: 'Continuous spun-polyester or nylon bottom thread inside the rotary hook bobbins.',
    isBeadInput: false,
    category: 'Bobbin & Underthread',
    defaultUnit: 'cones',
    suggestedUnits: ['cones', 'spools', 'boxes', 'meters'],
    suggestedSizes: ['60/2 Spun Polyester', '70D/2 Filament Nylon', 'Pre-Wound Magnetic #L', '80/2 High-Tensile Poly'],
    suggestedColors: [
      { name: 'Standard White', hex: '#F8FAFC' },
      { name: 'Charcoal Black', hex: '#1E293B' }
    ],
    defaultCodePrefix: 'BOB',
    sampleName: '60/2 Spun Polyester Underthread Bobbin Cone (10000m)',
    defaultThreshold: 30,
    defaultStock: 180,
    defaultBurnRate: 6,
    defaultUnitCost: 110.0
  },
  {
    slotNumber: 10,
    slotKey: 'cording_yarn',
    name: 'Cording / Dori / Piping Yarn',
    shortLabel: 'Cording / Dori Yarn',
    role: 'Raised outlines & bead border guide',
    description: 'Thick filler yarn or heavy metallic cord fed through specialized cording guides to create raised borders around the beads.',
    isBeadInput: false,
    category: 'Cording, Dori & Piping Yarn',
    defaultUnit: 'meters',
    suggestedUnits: ['meters', 'spools', 'kg', 'rolls', 'yards'],
    suggestedSizes: ['1.5 mm Dori Cord', '2.5 mm Metallic Piping', '3.5 mm Filler Yarn', '5.0 mm Heavy Braid Dori'],
    suggestedColors: [
      { name: 'Metallic Gold Dori', hex: '#D97706' },
      { name: 'Silver Braided Cord', hex: '#CBD5E1' },
      { name: 'Antique Bronze Dori', hex: '#92400E' },
      { name: 'Natural Cotton Core', hex: '#FEF3C7' },
      { name: 'Black Outline Cord', hex: '#0F172A' }
    ],
    defaultCodePrefix: 'DOR',
    sampleName: '2.5mm Metallic Gold Braided Dori Cording Yarn',
    defaultThreshold: 250,
    defaultStock: 1500,
    defaultBurnRate: 35,
    defaultUnitCost: 14.5
  }
];

// Optional 11th Input Slot (5th Bead/Sequin Device: Cup / Holographic / Star Sequins)
export const BEAD_DEVICE_5_SLOT: StandardMachineInputSlot = {
  slotNumber: 7,
  slotKey: 'bead_device_5',
  name: 'Bead Device 5: Cup / Holographic / Star Sequins',
  shortLabel: 'Bead 5: Cup/Star Sequins',
  role: 'Feeder Cassette 5 (Specialty Bead/Sequin Device)',
  description: 'Reversible, cup-shaped, star, or fancy shaped sequins loaded in feeder 5.',
  isBeadInput: true,
  beadDeviceNumber: 5,
  category: 'Bead Device 5 (Cup / Holographic Sequins)',
  defaultUnit: 'rolls',
  suggestedUnits: ['rolls', 'packets', 'meters', 'grams', 'gross', 'pcs'],
  suggestedSizes: ['4 mm Cup Sequin', '5 mm Holographic Cup', '6 mm Star Sequin', '7 mm Reversible Two-Tone', 'Faceted Crystal Bead Reel'],
  suggestedColors: [
    { name: 'Holographic Silver Cup', hex: '#E0F2FE' },
    { name: 'Two-Tone Gold/Black Cup', hex: '#CA8A04' },
    { name: 'Prism Rainbow Star', hex: '#F472B6' },
    { name: 'Emerald Metallic Cup', hex: '#059669' }
  ],
  defaultCodePrefix: 'CUP',
  sampleName: '5mm Holographic Prism Cup Sequins (Feeder #5)',
  defaultThreshold: 40,
  defaultStock: 250,
  defaultBurnRate: 15,
  defaultUnitCost: 210.0
};

export const STANDARD_MACHINE_INPUTS_11: StandardMachineInputSlot[] = [
  STANDARD_MACHINE_INPUTS_10[0], // 1: Base Fabric
  STANDARD_MACHINE_INPUTS_10[1], // 2: Backing Paper
  STANDARD_MACHINE_INPUTS_10[2], // 3: Bead Device 1 (Cutdana)
  STANDARD_MACHINE_INPUTS_10[3], // 4: Bead Device 2 (Seed)
  STANDARD_MACHINE_INPUTS_10[4], // 5: Bead Device 3 (Moti)
  STANDARD_MACHINE_INPUTS_10[5], // 6: Bead Device 4 (Flat Sequins)
  BEAD_DEVICE_5_SLOT,            // 7: Bead Device 5 (Cup / Holographic)
  { ...STANDARD_MACHINE_INPUTS_10[6], slotNumber: 8 },  // 8: Lace / Ribbon
  { ...STANDARD_MACHINE_INPUTS_10[7], slotNumber: 9 },  // 9: Top Threads
  { ...STANDARD_MACHINE_INPUTS_10[8], slotNumber: 10 }, // 10: Bobbin Thread
  { ...STANDARD_MACHINE_INPUTS_10[9], slotNumber: 11 }  // 11: Cording Yarn
];

export const DEFAULT_CATEGORIES = [
  'Base Fabric (Ground Cloth)',
  'Backing Paper / Stabilizer',
  'Bead Device 1 (Cutdana / Tube)',
  'Bead Device 2 (Round Glass / Seed)',
  'Bead Device 3 (Moti / Pearl Beads)',
  'Bead Device 4 (Sequins / Sitara)',
  'Bead Device 5 (Cup / Holographic Sequins)',
  'Lace & Border Ribbons',
  'Top Needle Threads (Zari & Colors)',
  'Bobbin & Underthread',
  'Cording, Dori & Piping Yarn',
  'Other'
];

export interface CategoryContextProfile {
  category: string;
  defaultUnit: string;
  suggestedUnits: string[];
  suggestedSizes: string[];
  suggestedColorNames: { name: string; hex: string }[];
  suggestedVendors: string[];
  defaultCodePrefix: string;
  sampleName: string;
  defaultThreshold: number;
  defaultStock: number;
  defaultBurnRate: number;
  defaultUnitCost: number;
}

export const CATEGORY_PROFILES: Record<string, CategoryContextProfile> = {
  'base fabric': {
    category: 'Base Fabric (Ground Cloth)',
    defaultUnit: 'meters',
    suggestedUnits: ['meters', 'yards', 'rolls', 'kg'],
    suggestedSizes: ['44" Width', '54" Width', '60" Width', 'Micro Net', 'Organza Sheer', 'Velvet 9000', 'Raw Silk 100 GSM', 'Georgette 60 GSM'],
    suggestedColorNames: [
      { name: 'Pure White', hex: '#FFFFFF' },
      { name: 'Jet Black', hex: '#1E293B' },
      { name: 'Champagne Beige', hex: '#F5E6D3' },
      { name: 'Royal Navy', hex: '#1E3A8A' },
      { name: 'Crimson Maroon', hex: '#881337' },
      { name: 'Emerald Green', hex: '#065F46' }
    ],
    suggestedVendors: [
      'Surat Silk Mills',
      'Apex Textile Weavers',
      'Vardhman Fabrics',
      'Premier Organza & Nets',
      'Global Weaves Corp'
    ],
    defaultCodePrefix: 'FAB',
    sampleName: 'Nylon Sheer Micro Net Base Fabric',
    defaultThreshold: 500,
    defaultStock: 2500,
    defaultBurnRate: 60,
    defaultUnitCost: 45.0
  },
  'backing paper': {
    category: 'Backing Paper / Stabilizer',
    defaultUnit: 'meters',
    suggestedUnits: ['meters', 'rolls', 'kg', 'yards'],
    suggestedSizes: ['40 GSM Tearaway', '60 GSM Tearaway', '80 GSM Heavy Cutaway', 'Water-Soluble PVA Film 35u', 'Heat-Away Film'],
    suggestedColorNames: [
      { name: 'Standard White', hex: '#F8FAFC' },
      { name: 'Translucent PVA', hex: '#E2E8F0' },
      { name: 'Black Backing', hex: '#334155' }
    ],
    suggestedVendors: [
      'StabilTex Non-Wovens',
      'PVA Film Technologies',
      'Premier Backing Supplies',
      'Apex Paper Mills'
    ],
    defaultCodePrefix: 'STB',
    sampleName: 'Non-Woven Tearaway Embroidery Paper 50 GSM',
    defaultThreshold: 800,
    defaultStock: 4000,
    defaultBurnRate: 65,
    defaultUnitCost: 8.5
  },
  'cutdana': {
    category: 'Bead Device 1 (Cutdana / Tube)',
    defaultUnit: 'packets',
    suggestedUnits: ['packets', 'grams', 'kg', 'gross', 'strands', 'pcs', 'boxes'],
    suggestedSizes: ['2 Cut (1.8 mm)', '3 Cut (2.5 mm)', '4 Cut (3.2 mm)', 'Bugle 6 mm', 'Hex Cutdana 2 Cut'],
    suggestedColorNames: [
      { name: 'Metallic Antique Gold', hex: '#D97706' },
      { name: 'Silver Sheen', hex: '#94A3B8' },
      { name: 'Rose Gold', hex: '#F43F5E' },
      { name: 'Jet Black Gloss', hex: '#0F172A' },
      { name: 'Copper Bronze', hex: '#B45309' },
      { name: 'Emerald Luster', hex: '#059669' }
    ],
    suggestedVendors: [
      'Preciosa Crystal Works',
      'Miyuki Glass Trading',
      'Matsuno Glass Beads',
      'Apex Cutdana Imports',
      'ShineCraft Beads Corp'
    ],
    defaultCodePrefix: 'CUT',
    sampleName: '2-Cut Metallic Antique Gold Glass Cutdana',
    defaultThreshold: 100,
    defaultStock: 600,
    defaultBurnRate: 25,
    defaultUnitCost: 120.0
  },
  'seed': {
    category: 'Bead Device 2 (Round Glass / Seed)',
    defaultUnit: 'packets',
    suggestedUnits: ['packets', 'grams', 'kg', 'gross', 'strands', 'pcs', 'boxes'],
    suggestedSizes: ['2.0 mm (#11/0)', '2.5 mm (#9/0)', '3.0 mm (#8/0)', 'Micro Seed 1.5 mm'],
    suggestedColorNames: [
      { name: 'Crystal AB Rainbow', hex: '#E0E7FF' },
      { name: 'Pearl Ivory White', hex: '#FFFBEB' },
      { name: 'Metallic Gold Luster', hex: '#F59E0B' },
      { name: 'Metallic Gunmetal', hex: '#475569' },
      { name: 'Ruby Red Transparent', hex: '#DC2626' }
    ],
    suggestedVendors: [
      'Miyuki Glass Trading',
      'Preciosa Ornela',
      'Toho Beads Japan',
      'Apex Beads & Findings'
    ],
    defaultCodePrefix: 'SED',
    sampleName: '2.5mm Round Glass Seed Beads #9/0',
    defaultThreshold: 120,
    defaultStock: 750,
    defaultBurnRate: 30,
    defaultUnitCost: 95.0
  },
  'moti': {
    category: 'Bead Device 3 (Moti / Pearl Beads)',
    defaultUnit: 'packets',
    suggestedUnits: ['packets', 'gross', 'strands', 'pcs', 'grams', 'kg', 'boxes'],
    suggestedSizes: ['3.0 mm Moti', '4.0 mm Pearl', '5.0 mm Round Pearl', '6.0 mm Drop Pearl', 'Faceted Acrylic 4 mm'],
    suggestedColorNames: [
      { name: 'Natural Pearl Cream', hex: '#FEF3C7' },
      { name: 'Pure White Pearl', hex: '#F8FAFC' },
      { name: 'Champagne Gold Moti', hex: '#FBBF24' },
      { name: 'Rose Tinted Pearl', hex: '#FBCFE8' }
    ],
    suggestedVendors: [
      'Crystal Pearl Trading',
      'ShineCraft Pearls',
      'Global Findings Corp',
      'Apex Beads & Findings'
    ],
    defaultCodePrefix: 'MOT',
    sampleName: '4.0mm High-Luster Ivory Pearl Moti Beads',
    defaultThreshold: 80,
    defaultStock: 500,
    defaultBurnRate: 20,
    defaultUnitCost: 140.0
  },
  'sequins': {
    category: 'Bead Device 4 (Sequins / Sitara)',
    defaultUnit: 'rolls',
    suggestedUnits: ['rolls', 'packets', 'meters', 'grams', 'gross', 'pcs'],
    suggestedSizes: ['3 mm Flat Sequin', '5 mm Flat Sitara', '7 mm Flat Reel', '9 mm Jumbo Sequin', 'Square 4 mm Sitara'],
    suggestedColorNames: [
      { name: 'Gloss Antique Gold', hex: '#EAB308' },
      { name: 'Silver Mirror Foil', hex: '#E2E8F0' },
      { name: 'Holographic Rainbow', hex: '#A7F3D0' },
      { name: 'Matte Rose Gold', hex: '#FDA4AF' },
      { name: 'Emerald Sparkle', hex: '#10B981' }
    ],
    suggestedVendors: [
      'GlowTech Sequins Ltd',
      'FoilStar Trims',
      'Apex Sequins & Spangles',
      'Vanguard Reel Corp'
    ],
    defaultCodePrefix: 'SEQ',
    sampleName: '5mm Flat Gloss Antique Gold Reel Sequins',
    defaultThreshold: 50,
    defaultStock: 300,
    defaultBurnRate: 15,
    defaultUnitCost: 180.0
  },
  'cup sequins': {
    category: 'Bead Device 5 (Cup / Holographic Sequins)',
    defaultUnit: 'rolls',
    suggestedUnits: ['rolls', 'packets', 'meters', 'grams', 'gross', 'pcs'],
    suggestedSizes: ['4 mm Cup Sequin', '5 mm Holographic Cup', '6 mm Star Sequin', '7 mm Reversible Two-Tone'],
    suggestedColorNames: [
      { name: 'Holographic Silver Cup', hex: '#E0F2FE' },
      { name: 'Two-Tone Gold/Black Cup', hex: '#CA8A04' },
      { name: 'Prism Rainbow Star', hex: '#F472B6' }
    ],
    suggestedVendors: [
      'FoilStar Specialty Sequins',
      'GlowTech Trims',
      'Apex Sequins & Spangles'
    ],
    defaultCodePrefix: 'CUP',
    sampleName: '5mm Holographic Prism Cup Sequins',
    defaultThreshold: 40,
    defaultStock: 250,
    defaultBurnRate: 15,
    defaultUnitCost: 210.0
  },
  'lace': {
    category: 'Lace & Border Ribbons',
    defaultUnit: 'meters',
    suggestedUnits: ['meters', 'yards', 'rolls', 'spools'],
    suggestedSizes: ['15 mm Satin Ribbon', '25 mm Velvet Border', '40 mm Base Lace Strip', '10 mm Appliqué Tape', '50 mm Border Trim'],
    suggestedColorNames: [
      { name: 'Antique Gold Trim', hex: '#CA8A04' },
      { name: 'Burgundy Red', hex: '#991B1B' },
      { name: 'Ivory White', hex: '#FFFBEB' },
      { name: 'Royal Navy Blue', hex: '#1E3A8A' }
    ],
    suggestedVendors: [
      'Premier Lace Works',
      'SilkLine Ribbons',
      'Apex Borders & Laces',
      'Vanguard Cordage Co.'
    ],
    defaultCodePrefix: 'LCE',
    sampleName: '25mm Double-Edge Satin Border Ribbon',
    defaultThreshold: 300,
    defaultStock: 1800,
    defaultBurnRate: 40,
    defaultUnitCost: 16.0
  },
  'needle threads': {
    category: 'Top Needle Threads (Zari & Colors)',
    defaultUnit: 'cones',
    suggestedUnits: ['cones', 'spools', 'meters', 'boxes'],
    suggestedSizes: ['Kasab Zari #30', 'Badla Metallic #40', '120D/2 Viscose Rayon', '150D/2 Polyester Cone', 'Tri-Lobal Poly 40 Tex'],
    suggestedColorNames: [
      { name: 'Golden Metallic Kasab', hex: '#F59E0B' },
      { name: 'Silver Metallic Badla', hex: '#94A3B8' },
      { name: 'Copper Antique Zari', hex: '#B45309' },
      { name: 'Crimson Viscose', hex: '#DC2626' },
      { name: 'Midnight Black', hex: '#020617' }
    ],
    suggestedVendors: [
      'Vardhman Zari Threads',
      'Madura Coats Ltd',
      'Surat Metallic Yarn Corp',
      'Apex Fibers Ltd',
      'Kevlon Specialist Fibers'
    ],
    defaultCodePrefix: 'ZAR',
    sampleName: 'Kasab Metallic Zari #30 Top Needle Cone (5000m)',
    defaultThreshold: 40,
    defaultStock: 250,
    defaultBurnRate: 8,
    defaultUnitCost: 165.0
  },
  'bobbin': {
    category: 'Bobbin & Underthread',
    defaultUnit: 'cones',
    suggestedUnits: ['cones', 'spools', 'boxes', 'meters'],
    suggestedSizes: ['60/2 Spun Polyester', '70D/2 Filament Nylon', 'Pre-Wound Magnetic #L', '80/2 High-Tensile Poly'],
    suggestedColorNames: [
      { name: 'Standard White', hex: '#F8FAFC' },
      { name: 'Charcoal Black', hex: '#1E293B' }
    ],
    suggestedVendors: [
      'Madura Coats Ltd',
      'Vardhman Yarns',
      'Apex Fibers Ltd'
    ],
    defaultCodePrefix: 'BOB',
    sampleName: '60/2 Spun Polyester Underthread Bobbin Cone (10000m)',
    defaultThreshold: 30,
    defaultStock: 180,
    defaultBurnRate: 6,
    defaultUnitCost: 110.0
  },
  'cording': {
    category: 'Cording, Dori & Piping Yarn',
    defaultUnit: 'meters',
    suggestedUnits: ['meters', 'spools', 'kg', 'rolls', 'yards'],
    suggestedSizes: ['1.5 mm Dori Cord', '2.5 mm Metallic Piping', '3.5 mm Filler Yarn', '5.0 mm Heavy Braid Dori'],
    suggestedColorNames: [
      { name: 'Metallic Gold Dori', hex: '#D97706' },
      { name: 'Silver Braided Cord', hex: '#CBD5E1' },
      { name: 'Antique Bronze Dori', hex: '#92400E' },
      { name: 'Natural Cotton Core', hex: '#FEF3C7' }
    ],
    suggestedVendors: [
      'Surat Metallic Yarn Corp',
      'Vanguard Cordage Co.',
      'Apex Trims & Cords',
      'Premier Cording Works'
    ],
    defaultCodePrefix: 'DOR',
    sampleName: '2.5mm Metallic Gold Braided Dori Cording Yarn',
    defaultThreshold: 250,
    defaultStock: 1500,
    defaultBurnRate: 35,
    defaultUnitCost: 14.5
  },
  'beads': {
    category: 'Bead Device 1 (Cutdana / Tube)',
    defaultUnit: 'packets',
    suggestedUnits: ['packets', 'grams', 'kg', 'gross', 'strands', 'pcs', 'boxes'],
    suggestedSizes: ['2 Cut (1.8 mm)', '2.5 mm (#9/0)', '3.0 mm', '4.0 mm Pearl', '5 mm Sequin'],
    suggestedColorNames: [
      { name: 'Metallic Antique Gold', hex: '#D97706' },
      { name: 'Silver Sheen', hex: '#94A3B8' },
      { name: 'Emerald Green', hex: '#059669' },
      { name: 'Crystal Clear', hex: '#E2E8F0' },
      { name: 'Ruby Red', hex: '#DC2626' }
    ],
    suggestedVendors: [
      'Preciosa Crystal Works',
      'Miyuki Glass Trading',
      'Apex Beads & Findings',
      'Global Findings Corp'
    ],
    defaultCodePrefix: 'BEAD',
    sampleName: 'Glass Embroidery Beads',
    defaultThreshold: 100,
    defaultStock: 600,
    defaultBurnRate: 25,
    defaultUnitCost: 110.0
  }
};

export const DEFAULT_UNITS = [
  'packets',
  'meters',
  'cones',
  'rolls',
  'spools',
  'grams',
  'kg',
  'gross',
  'strands',
  'pcs',
  'yards',
  'boxes'
];

export const DEFAULT_SUPPLIERS = [
  'Surat Silk Mills',
  'Preciosa Crystal Works',
  'Miyuki Glass Trading',
  'Vardhman Zari Threads',
  'Madura Coats Ltd',
  'StabilTex Non-Wovens',
  'GlowTech Sequins Ltd',
  'Premier Lace Works',
  'Apex Beads & Findings',
  'Global Findings Corp',
  'Matsuno Glass Beads',
  'Surat Metallic Yarn Corp',
  'Apex Fibers Ltd'
];

export const DEFAULT_LOCATIONS = [
  'Fabric Rack A-01 (Ground Cloth)',
  'Stabilizer Bay B-01 (Paper/PVA)',
  'Bead Cabinet #1 (Cutdana)',
  'Bead Cabinet #2 (Seed Beads)',
  'Bead Cabinet #3 (Moti & Pearls)',
  'Sequin Reel Rack S-01',
  'Specialty Feeder Tray #5',
  'Lace & Border Rack L-01',
  'Zari Thread Wall Z-01 (Cones)',
  'Bobbin Storage Box B-01',
  'Cording / Dori Shelf D-01'
];

export function getCategoryProfile(category: string): CategoryContextProfile {
  const key = (category || '').toLowerCase().trim();
  if (CATEGORY_PROFILES[key]) {
    return CATEGORY_PROFILES[key];
  }
  // Check if it matches keywords
  if (key.includes('fabric') || key.includes('cloth') || key.includes('net') || key.includes('organza')) return CATEGORY_PROFILES['base fabric'];
  if (key.includes('backing') || key.includes('stabilizer') || key.includes('paper') || key.includes('pva')) return CATEGORY_PROFILES['backing paper'];
  if (key.includes('cutdana') || key.includes('tube') || key.includes('bugle')) return CATEGORY_PROFILES['cutdana'];
  if (key.includes('seed') || key.includes('round glass')) return CATEGORY_PROFILES['seed'];
  if (key.includes('moti') || key.includes('pearl')) return CATEGORY_PROFILES['moti'];
  if (key.includes('cup') || key.includes('holographic')) return CATEGORY_PROFILES['cup sequins'];
  if (key.includes('sequin') || key.includes('sitara')) return CATEGORY_PROFILES['sequins'];
  if (key.includes('lace') || key.includes('ribbon') || key.includes('border')) return CATEGORY_PROFILES['lace'];
  if (key.includes('zari') || key.includes('needle') || key.includes('top thread') || key.includes('kasab') || key.includes('badla')) return CATEGORY_PROFILES['needle threads'];
  if (key.includes('bobbin') || key.includes('underthread') || key.includes('bottom')) return CATEGORY_PROFILES['bobbin'];
  if (key.includes('cording') || key.includes('dori') || key.includes('piping') || key.includes('yarn') || key.includes('cord')) return CATEGORY_PROFILES['cording'];
  if (key.includes('bead')) return CATEGORY_PROFILES['cutdana'];

  // Generic fallback
  return {
    category: category || 'Other',
    defaultUnit: 'packets',
    suggestedUnits: DEFAULT_UNITS,
    suggestedSizes: ['Standard', '2 mm', '3 mm', '4 mm', '5 mm', '25 mm', 'Kasab #30'],
    suggestedColorNames: [
      { name: 'Metallic Gold', hex: '#F59E0B' },
      { name: 'Silver Sheen', hex: '#94A3B8' },
      { name: 'Pure White', hex: '#FFFFFF' },
      { name: 'Jet Black', hex: '#0F172A' },
      { name: 'Emerald Green', hex: '#059669' },
      { name: 'Ruby Red', hex: '#DC2626' }
    ],
    suggestedVendors: DEFAULT_SUPPLIERS,
    defaultCodePrefix: 'SKU-' + (category ? category.substring(0, 3).toUpperCase() : 'GEN'),
    sampleName: `${category} Material Item`,
    defaultThreshold: 100,
    defaultStock: 500,
    defaultBurnRate: 20,
    defaultUnitCost: 50.0
  };
}

export function getStoredCategories(materials: RawMaterial[] = []): string[] {
  try {
    const saved = localStorage.getItem('factory_custom_categories');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const deleted = localStorage.getItem('factory_deleted_categories');
    const deletedSet = new Set(deleted ? (JSON.parse(deleted) as string[]).map(c => c.toLowerCase().trim()) : []);
    
    const matCats = materials.map(m => m.category).filter(Boolean);
    const combined = Array.from(new Set([...parsed, ...matCats, ...DEFAULT_CATEGORIES]))
      .filter(c => c && !deletedSet.has(c.toLowerCase().trim()));
    
    if (combined.length === 0) return ['Other'];
    return combined;
  } catch (e) {
    return DEFAULT_CATEGORIES;
  }
}

export function saveStoredCategory(category: string): string[] {
  const trimmed = category.trim();
  if (!trimmed) return getStoredCategories();
  try {
    // Un-delete if previously deleted
    const deleted = localStorage.getItem('factory_deleted_categories');
    if (deleted) {
      const deletedList: string[] = JSON.parse(deleted);
      const filteredDeleted = deletedList.filter(c => c.toLowerCase() !== trimmed.toLowerCase());
      localStorage.setItem('factory_deleted_categories', JSON.stringify(filteredDeleted));
    }

    const saved = localStorage.getItem('factory_custom_categories');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const updated = [trimmed, ...parsed.filter(c => c.toLowerCase() !== trimmed.toLowerCase())];
    localStorage.setItem('factory_custom_categories', JSON.stringify(updated.slice(0, 50)));
    return getStoredCategories();
  } catch (e) {
    return DEFAULT_CATEGORIES;
  }
}

export function deleteStoredCategory(
  categoryToDelete: string,
  materials: RawMaterial[] = [],
  fallbackCategory: string = 'Other'
): { updatedCategories: string[]; updatedMaterials: RawMaterial[]; reassignedCount: number } {
  const trimmed = categoryToDelete.trim();
  if (!trimmed) {
    return { updatedCategories: getStoredCategories(materials), updatedMaterials: materials, reassignedCount: 0 };
  }

  try {
    // 1. Add to factory_deleted_categories
    const deleted = localStorage.getItem('factory_deleted_categories');
    const deletedList: string[] = deleted ? JSON.parse(deleted) : [];
    if (!deletedList.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      deletedList.push(trimmed.toLowerCase());
      localStorage.setItem('factory_deleted_categories', JSON.stringify(deletedList));
    }

    // 2. Remove from factory_custom_categories
    const saved = localStorage.getItem('factory_custom_categories');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const filteredCustom = parsed.filter(c => c.toLowerCase() !== trimmed.toLowerCase());
    localStorage.setItem('factory_custom_categories', JSON.stringify(filteredCustom));

    // 3. Reassign any materials currently using this category
    let reassignedCount = 0;
    const updatedMaterials = materials.map(mat => {
      if ((mat.category || '').toLowerCase().trim() === trimmed.toLowerCase()) {
        reassignedCount++;
        return {
          ...mat,
          category: fallbackCategory || 'Other'
        };
      }
      return mat;
    });

    const updatedCategories = getStoredCategories(updatedMaterials);
    return { updatedCategories, updatedMaterials, reassignedCount };
  } catch (e) {
    return { updatedCategories: getStoredCategories(materials), updatedMaterials: materials, reassignedCount: 0 };
  }
}

export function bulkDeleteUnusedCategories(
  materials: RawMaterial[] = []
): { updatedCategories: string[]; deletedCount: number; deletedCategories: string[] } {
  try {
    const currentCats = getStoredCategories(materials);
    const usedCatsLower = new Set(materials.map(m => (m.category || '').toLowerCase().trim()));
    
    // Categories with 0 materials (protect 'Other')
    const unused = currentCats.filter(cat => 
      !usedCatsLower.has(cat.toLowerCase().trim()) && 
      cat.toLowerCase().trim() !== 'other'
    );

    if (unused.length === 0) {
      return { updatedCategories: currentCats, deletedCount: 0, deletedCategories: [] };
    }

    const deleted = localStorage.getItem('factory_deleted_categories');
    const deletedList: string[] = deleted ? JSON.parse(deleted) : [];
    unused.forEach(cat => {
      if (!deletedList.some(c => c.toLowerCase() === cat.toLowerCase().trim())) {
        deletedList.push(cat.toLowerCase().trim());
      }
    });
    localStorage.setItem('factory_deleted_categories', JSON.stringify(deletedList));

    const saved = localStorage.getItem('factory_custom_categories');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const unusedSetLower = new Set(unused.map(u => u.toLowerCase().trim()));
    const filteredCustom = parsed.filter(c => !unusedSetLower.has(c.toLowerCase().trim()));
    localStorage.setItem('factory_custom_categories', JSON.stringify(filteredCustom));

    const updatedCategories = getStoredCategories(materials);
    return { updatedCategories, deletedCount: unused.length, deletedCategories: unused };
  } catch (e) {
    return { updatedCategories: getStoredCategories(materials), deletedCount: 0, deletedCategories: [] };
  }
}

export function renameStoredCategory(
  oldName: string,
  newName: string,
  materials: RawMaterial[] = []
): { updatedCategories: string[]; updatedMaterials: RawMaterial[]; modifiedCount: number } {
  const trimmedOld = oldName.trim();
  const trimmedNew = newName.trim();
  if (!trimmedOld || !trimmedNew || trimmedOld.toLowerCase() === trimmedNew.toLowerCase()) {
    return { updatedCategories: getStoredCategories(materials), updatedMaterials: materials, modifiedCount: 0 };
  }

  try {
    // 1. Delete old name
    const deleted = localStorage.getItem('factory_deleted_categories');
    const deletedList: string[] = deleted ? JSON.parse(deleted) : [];
    if (!deletedList.some(c => c.toLowerCase() === trimmedOld.toLowerCase())) {
      deletedList.push(trimmedOld.toLowerCase());
      localStorage.setItem('factory_deleted_categories', JSON.stringify(deletedList));
    }

    // 2. Save new name
    saveStoredCategory(trimmedNew);

    // 3. Update materials
    let modifiedCount = 0;
    const updatedMaterials = materials.map(mat => {
      if ((mat.category || '').toLowerCase().trim() === trimmedOld.toLowerCase()) {
        modifiedCount++;
        return {
          ...mat,
          category: trimmedNew
        };
      }
      return mat;
    });

    const updatedCategories = getStoredCategories(updatedMaterials);
    return { updatedCategories, updatedMaterials, modifiedCount };
  } catch (e) {
    return { updatedCategories: getStoredCategories(materials), updatedMaterials: materials, modifiedCount: 0 };
  }
}

export function resetDefaultCategories(materials: RawMaterial[] = []): string[] {
  try {
    localStorage.removeItem('factory_deleted_categories');
    localStorage.removeItem('factory_custom_categories');
    return getStoredCategories(materials);
  } catch (e) {
    return DEFAULT_CATEGORIES;
  }
}

export function getStoredUnits(materials: RawMaterial[] = []): string[] {
  try {
    const saved = localStorage.getItem('factory_custom_units');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const matUnits = materials.map(m => m.unit).filter(Boolean);
    const combined = Array.from(new Set([...parsed, ...matUnits, ...DEFAULT_UNITS]));
    return combined;
  } catch (e) {
    return DEFAULT_UNITS;
  }
}

export function saveStoredUnit(unit: string): string[] {
  const trimmed = unit.trim().toLowerCase();
  if (!trimmed) return getStoredUnits();
  try {
    const saved = localStorage.getItem('factory_custom_units');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const updated = [trimmed, ...parsed.filter(u => u.toLowerCase() !== trimmed)];
    localStorage.setItem('factory_custom_units', JSON.stringify(updated.slice(0, 50)));
    return updated;
  } catch (e) {
    return DEFAULT_UNITS;
  }
}

export function getStoredSuppliers(materials: RawMaterial[] = []): string[] {
  try {
    const saved = localStorage.getItem('factory_custom_suppliers');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const matSuppliers = materials.map(m => m.supplier).filter(Boolean);
    const combined = Array.from(new Set([...parsed, ...matSuppliers, ...DEFAULT_SUPPLIERS]));
    return combined;
  } catch (e) {
    return DEFAULT_SUPPLIERS;
  }
}

export function saveStoredSupplier(supplier: string): string[] {
  const trimmed = supplier.trim();
  if (!trimmed) return getStoredSuppliers();
  try {
    const saved = localStorage.getItem('factory_custom_suppliers');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const updated = [trimmed, ...parsed.filter(s => s.toLowerCase() !== trimmed.toLowerCase())];
    localStorage.setItem('factory_custom_suppliers', JSON.stringify(updated.slice(0, 50)));
    return updated;
  } catch (e) {
    return DEFAULT_SUPPLIERS;
  }
}

export function getStoredSizes(category?: string, materials: RawMaterial[] = []): string[] {
  try {
    const profile = category ? getCategoryProfile(category) : null;
    const baseSizes = profile ? profile.suggestedSizes : ['2 Cut (1.8 mm)', '2.5 mm', '3.0 mm', '4.0 mm Pearl', '5 mm Flat Sequin', 'Kasab #30', '44" Width'];
    const key = `factory_custom_sizes_${(category || 'all').toLowerCase().replace(/\s+/g, '_')}`;
    const saved = localStorage.getItem(key);
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const matSizes = materials.filter(m => !category || m.category?.toLowerCase() === category.toLowerCase()).map(m => m.size).filter(Boolean) as string[];
    return Array.from(new Set([...parsed, ...matSizes, ...baseSizes]));
  } catch (e) {
    return ['2 Cut (1.8 mm)', '2.5 mm', '3.0 mm', '4.0 mm Pearl', '5 mm Flat Sequin'];
  }
}

export function saveStoredSize(category: string, size: string): string[] {
  const trimmed = size.trim();
  if (!trimmed) return getStoredSizes(category);
  try {
    const key = `factory_custom_sizes_${(category || 'all').toLowerCase().replace(/\s+/g, '_')}`;
    const saved = localStorage.getItem(key);
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const updated = [trimmed, ...parsed.filter(s => s.toLowerCase() !== trimmed.toLowerCase())];
    localStorage.setItem(key, JSON.stringify(updated.slice(0, 50)));
    return updated;
  } catch (e) {
    return getStoredSizes(category);
  }
}

export function getStoredLocations(materials: RawMaterial[] = []): string[] {
  try {
    const saved = localStorage.getItem('factory_custom_locations');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const matLocs = materials.map(m => m.locationBin).filter(Boolean);
    const combined = Array.from(new Set([...parsed, ...matLocs, ...DEFAULT_LOCATIONS]));
    return combined;
  } catch (e) {
    return DEFAULT_LOCATIONS;
  }
}

export function saveStoredLocation(location: string): string[] {
  const trimmed = location.trim();
  if (!trimmed) return getStoredLocations();
  try {
    const saved = localStorage.getItem('factory_custom_locations');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const updated = [trimmed, ...parsed.filter(l => l.toLowerCase() !== trimmed.toLowerCase())];
    localStorage.setItem('factory_custom_locations', JSON.stringify(updated.slice(0, 50)));
    return updated;
  } catch (e) {
    return DEFAULT_LOCATIONS;
  }
}

export function getStoredLots(materials: RawMaterial[] = []): string[] {
  try {
    const saved = localStorage.getItem('factory_custom_lots');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const matLots = materials.map(m => m.lotNumber).filter(Boolean);
    const combined = Array.from(new Set([...parsed, ...matLots]));
    return combined;
  } catch (e) {
    return [];
  }
}

export function saveStoredLot(lot: string): string[] {
  const trimmed = lot.trim().toUpperCase();
  if (!trimmed) return getStoredLots();
  try {
    const saved = localStorage.getItem('factory_custom_lots');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const updated = [trimmed, ...parsed.filter(l => l !== trimmed)];
    localStorage.setItem('factory_custom_lots', JSON.stringify(updated.slice(0, 50)));
    return updated;
  } catch (e) {
    return [];
  }
}

export function getStoredColors(category?: string): { name: string; hex: string }[] {
  try {
    const prof = category ? getCategoryProfile(category) : null;
    const baseColors = prof?.suggestedColorNames || [
      { name: 'Metallic Antique Gold', hex: '#D97706' },
      { name: 'Silver Sheen', hex: '#94A3B8' },
      { name: 'Pure White', hex: '#FFFFFF' },
      { name: 'Jet Black Gloss', hex: '#0F172A' },
      { name: 'Emerald Green', hex: '#059669' },
      { name: 'Natural Pearl Cream', hex: '#FEF3C7' }
    ];
    const saved = localStorage.getItem('factory_custom_colors');
    const parsed: { name: string; hex: string }[] = saved ? JSON.parse(saved) : [];
    return [...parsed, ...baseColors.filter(b => !parsed.some(p => p.name.toLowerCase() === b.name.toLowerCase()))];
  } catch (e) {
    return [];
  }
}

export function saveStoredColor(name: string, hex: string): { name: string; hex: string }[] {
  const trimmedName = name.trim();
  if (!trimmedName) return getStoredColors();
  try {
    const current = getStoredColors();
    const updated = [{ name: trimmedName, hex }, ...current.filter(c => c.name.toLowerCase() !== trimmedName.toLowerCase())];
    localStorage.setItem('factory_custom_colors', JSON.stringify(updated.slice(0, 30)));
    return updated;
  } catch (e) {
    return [];
  }
}

export function generateItemCode(category: string = 'Beads', size: string = '2.5mm', prefix?: string): string {
  const prof = getCategoryProfile(category);
  const codePrefix = prefix || prof.defaultCodePrefix || 'SKU';
  const cleanSize = size ? size.replace(/[^a-zA-Z0-9#]/g, '') : 'STD';
  return `${codePrefix}-${cleanSize.toUpperCase()}`;
}

export function generateLotNumber(category: string = 'RAW', materialName: string = ''): string {
  const year = new Date().getFullYear();
  let prefix = category ? category.substring(0, 3).toUpperCase() : 'RAW';
  if (materialName && materialName.length >= 3) {
    const words = materialName.split(' ').filter(w => w.length > 2);
    if (words.length >= 2) {
      prefix = (words[0].substring(0, 2) + words[1].substring(0, 1)).toUpperCase();
    }
  }
  const randomNum = Math.floor(10 + Math.random() * 89);
  return `LOT-${prefix}-${year}-${randomNum}`;
}

export const DEFAULT_PARTIES = [
  'FabIndia Crafts Ltd',
  'Raymond Premium Textiles',
  'Zara Apparel Sourcing',
  'Manyavar Ethnic Wear',
  'Sabyasachi Couture Studio',
  'Aditya Birla Fashion',
  'Decathlon Global Exports',
  'Reliance Retail Lifestyle'
];

export function getStoredParties(existingParties: string[] = []): string[] {
  try {
    const saved = localStorage.getItem('factory_custom_parties');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const combined = Array.from(new Set([...parsed, ...existingParties.filter(Boolean), ...DEFAULT_PARTIES]));
    return combined;
  } catch (e) {
    return DEFAULT_PARTIES;
  }
}

export function saveStoredParty(party: string): string[] {
  const trimmed = party.trim();
  if (!trimmed) return getStoredParties();
  try {
    const saved = localStorage.getItem('factory_custom_parties');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const updated = [trimmed, ...parsed.filter(p => p.toLowerCase() !== trimmed.toLowerCase())];
    localStorage.setItem('factory_custom_parties', JSON.stringify(updated.slice(0, 50)));
    return updated;
  } catch (e) {
    return DEFAULT_PARTIES;
  }
}

export const DEFAULT_TRANSPORTERS = [
  'VRL Logistics',
  'BlueDart Express',
  'Safexpress Cargo',
  'Delhivery Freight',
  'TCI Freight',
  'Internal Delivery Van #1',
  'Internal Delivery Van #2',
  'Customer Self-Pickup / Courier'
];

export function getStoredTransporters(): string[] {
  try {
    const saved = localStorage.getItem('factory_custom_transporters');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const combined = Array.from(new Set([...parsed, ...DEFAULT_TRANSPORTERS]));
    return combined;
  } catch (e) {
    return DEFAULT_TRANSPORTERS;
  }
}

export function saveStoredTransporter(transporter: string): string[] {
  const trimmed = transporter.trim();
  if (!trimmed) return getStoredTransporters();
  try {
    const saved = localStorage.getItem('factory_custom_transporters');
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    const updated = [trimmed, ...parsed.filter(t => t.toLowerCase() !== trimmed.toLowerCase())];
    localStorage.setItem('factory_custom_transporters', JSON.stringify(updated.slice(0, 30)));
    return updated;
  } catch (e) {
    return DEFAULT_TRANSPORTERS;
  }
}

// ==========================================
// 25-HEAD YUEMEI EMBROIDERY & BEAD MACHINE SPECIFICATIONS
// ==========================================

export interface YuemeiSpeedModeConfig {
  mode: MachineOperatingSpeedMode;
  name: string;
  minRpm: number;
  maxRpm: number;
  defaultRpm: number;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  safetyAdvisory: string;
}

export const YUEMEI_25HEAD_SPECS = {
  make: 'Yuemei Industrial Co.',
  modelSeries: 'Yuemei 25-Head High-Speed Beading & Sequin Multi-Head Machine',
  headCount: 25,
  headIntervalPitchMm: {
    min: 400,
    max: 500,
    typical: 400,
    options: [400, 450, 500],
    description: 'Typically 400 mm to 500 mm per head interval'
  },
  totalFrameLengthMeters: {
    min: 10.5,
    max: 13.5,
    typical: 12.5,
    description: 'Around 10.5 to 13.5 meters across all 25 heads on the X-axis'
  },
  embroideryAreaPerHeadMm: {
    x: 400,
    y: 1200,
    extendedY: 1500,
    description: 'Typically 400 mm × 1200 mm (or up to 1500 mm in the Y-axis for full sarees/lehenga panels)'
  },
  speedModes: {
    cutdana: {
      mode: 'cutdana',
      name: 'Bead / Cutdana Operation',
      minRpm: 450,
      maxRpm: 650,
      defaultRpm: 550,
      icon: '💎',
      color: '#2563EB',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-800',
      description: 'Slowed to prevent glass tube shattering and hopper/feeder jamming',
      safetyAdvisory: 'Operating range: 450 – 650 RPM (slower to prevent glass shattering and hopper jamming).'
    } as YuemeiSpeedModeConfig,
    sequin: {
      mode: 'sequin',
      name: 'Sequin Operation',
      minRpm: 650,
      maxRpm: 800,
      defaultRpm: 720,
      icon: '✨',
      color: '#D97706',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      description: 'Synchronized reel feeding with automatic pneumatic cutter punch',
      safetyAdvisory: 'Operating range: 650 – 800 RPM.'
    } as YuemeiSpeedModeConfig,
    flat_zari: {
      mode: 'flat_zari',
      name: 'Plain Flat / Zari Stitching',
      minRpm: 850,
      maxRpm: 1000,
      defaultRpm: 920,
      icon: '🧵',
      color: '#059669',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
      description: 'Maximum embroidery speed for needle threads, kasab zari, and flat satin fills',
      safetyAdvisory: 'Operating range: 850 – 1000 RPM.'
    } as YuemeiSpeedModeConfig
  }
};

// ==========================================
// 25-HEAD YUEMEI RAW MATERIAL CONSUMPTION STANDARDS (PER 1 FULL FRAME)
// Based on typical medium-to-heavy designer bridal or lace pattern averaging ~100,000 to 150,000 stitches per head per frame across 25 heads.
// ==========================================

export interface YuemeiFrameStandardItem {
  slotNumber: number;
  name: string;
  category: string;
  metricType: 'length' | 'weight' | 'reels';
  unit: string;
  minPerFrame: number;
  maxPerFrame: number;
  avgPerFrame: number;
  typicalRangeFormatted: string;
  description: string;
  perHeadRule?: string;
  burnRatePerHour: number;
}

export const YUEMEI_FRAME_CONSUMPTION_STANDARDS: YuemeiFrameStandardItem[] = [
  {
    slotNumber: 1,
    name: 'Base Fabric',
    category: 'Base Fabric (Ground Cloth)',
    metricType: 'length',
    unit: 'meters',
    minPerFrame: 11,
    maxPerFrame: 14,
    avgPerFrame: 12.5,
    typicalRangeFormatted: '11 – 14 meters',
    description: 'Running continuous across the 25 heads',
    burnRatePerHour: 60
  },
  {
    slotNumber: 2,
    name: 'Backing Paper / Stabilizer',
    category: 'Backing Paper / Stabilizer',
    metricType: 'length',
    unit: 'meters',
    minPerFrame: 11,
    maxPerFrame: 14,
    avgPerFrame: 12.5,
    typicalRangeFormatted: '11 – 14 meters',
    description: 'Matching fabric length underneath',
    burnRatePerHour: 65
  },
  {
    slotNumber: 3,
    name: 'Bead 1 (Cutdana / Bugle)',
    category: 'Bead Device 1 (Cutdana / Tube)',
    metricType: 'weight',
    unit: 'grams',
    minPerFrame: 250,
    maxPerFrame: 600,
    avgPerFrame: 425,
    typicalRangeFormatted: '250 g – 600 g',
    perHeadRule: 'approx. 10–25 g per head across 25 heads',
    description: 'Loaded on glass cutdana feeder hoppers',
    burnRatePerHour: 110
  },
  {
    slotNumber: 4,
    name: 'Bead 2 (Small Seed Beads 2mm)',
    category: 'Bead Device 2 (Round Glass / Seed)',
    metricType: 'weight',
    unit: 'grams',
    minPerFrame: 200,
    maxPerFrame: 500,
    avgPerFrame: 350,
    typicalRangeFormatted: '200 g – 500 g',
    perHeadRule: 'approx. 8–20 g per head across 25 heads',
    description: 'Round glass seed beads #9/0 or #11/0',
    burnRatePerHour: 90
  },
  {
    slotNumber: 5,
    name: 'Bead 3 (Pearl / Moti 3–4mm)',
    category: 'Bead Device 3 (Moti / Pearl Beads)',
    metricType: 'weight',
    unit: 'grams',
    minPerFrame: 300,
    maxPerFrame: 700,
    avgPerFrame: 500,
    typicalRangeFormatted: '300 g – 700 g',
    perHeadRule: 'heavier per unit count, approx. 12–28 g per head',
    description: 'Lustrous ivory/cream pearl round beads',
    burnRatePerHour: 130
  },
  {
    slotNumber: 6,
    name: 'Bead 4 (Flat Sequins / Sitara)',
    category: 'Bead Device 4 (Sequins / Sitara / Stars)',
    metricType: 'reels',
    unit: 'rolls',
    minPerFrame: 1,
    maxPerFrame: 2,
    avgPerFrame: 1.5,
    typicalRangeFormatted: '1 to 2 rolls',
    perHeadRule: '~20,000–50,000 pieces across all 25 heads',
    description: 'Continuous punch reel flat sequins 3mm/5mm',
    burnRatePerHour: 0.4
  },
  {
    slotNumber: 7,
    name: 'Bead 5 (Cup / Fancy Sequins)',
    category: 'Bead Device 5 (Cup / Star Sequins)',
    metricType: 'reels',
    unit: 'rolls',
    minPerFrame: 1,
    maxPerFrame: 2,
    avgPerFrame: 1.5,
    typicalRangeFormatted: '1 to 2 rolls',
    perHeadRule: 'fancy concave cup or star sequins',
    description: 'Secondary reel feeder cassette',
    burnRatePerHour: 0.4
  },
  {
    slotNumber: 8,
    name: 'Base Lace / Border Ribbon',
    category: 'Base Lace / Border Ribbon',
    metricType: 'length',
    unit: 'meters',
    minPerFrame: 11,
    maxPerFrame: 14,
    avgPerFrame: 12.5,
    typicalRangeFormatted: '11 – 14 meters',
    description: 'If running continuous border applique across 25 heads',
    burnRatePerHour: 55
  },
  {
    slotNumber: 9,
    name: 'Top Needle Thread (Zari / Poly)',
    category: 'Top Embroidery Thread (Needles)',
    metricType: 'length',
    unit: 'meters',
    minPerFrame: 6000,
    maxPerFrame: 10000,
    avgPerFrame: 8000,
    typicalRangeFormatted: '~6,000 – 10,000 meters total',
    perHeadRule: '~4–6 meters of top thread per 1,000 stitches per head across 25 heads',
    description: 'Needle thread / Kasab metallic zari spools',
    burnRatePerHour: 2200
  },
  {
    slotNumber: 10,
    name: 'Bobbin Thread (Underthread)',
    category: 'Bobbin / Bottom Thread',
    metricType: 'length',
    unit: 'meters',
    minPerFrame: 2000,
    maxPerFrame: 3500,
    avgPerFrame: 2750,
    typicalRangeFormatted: '~2,000 – 3,500 meters total',
    perHeadRule: '~1.5–2.5 meters per 1,000 stitches per head across 25 heads',
    description: 'Spun polyester 60/2 underthread cones',
    burnRatePerHour: 750
  }
];

/**
 * Calculates accurate raw material requirements for a 25-Head Yuemei Machine
 * based on frame count and pattern stitch density (100,000 – 150,000 stitches/head).
 */
export function calculateYuemei25HeadConsumption(
  frameCount: number = 1,
  stitchesPerHead: number = 125000,
  speedMode: MachineOperatingSpeedMode = 'cutdana',
  operatingRpm?: number
): Yuemei25HeadFrameCalculation {
  const count = Math.max(1, frameCount);
  const stitchRatio = Math.max(0.5, Math.min(2.5, stitchesPerHead / 125000));
  
  const speedConfig = YUEMEI_25HEAD_SPECS.speedModes[speedMode === 'custom' ? 'cutdana' : speedMode] || YUEMEI_25HEAD_SPECS.speedModes.cutdana;
  const rpm = operatingRpm || speedConfig.defaultRpm;

  // Stitches calculation: Stitches per frame / RPM / 60 minutes + 15% color change/trimming overhead
  const netMinutesPerFrame = (stitchesPerHead / rpm);
  const grossMinutesPerFrame = netMinutesPerFrame * 1.15; // 85% operational efficiency
  const hoursPerFrame = Math.round((grossMinutesPerFrame / 60) * 10) / 10;
  const totalHours = Math.round((hoursPerFrame * count) * 10) / 10;

  const materials: YuemeiFrameMaterialEstimate[] = YUEMEI_FRAME_CONSUMPTION_STANDARDS.map(std => {
    let perFrame = std.avgPerFrame;
    
    // Stitch-dependent scaling for threads and beads
    if (std.metricType === 'weight' || std.name.includes('Thread')) {
      perFrame = Math.round(std.avgPerFrame * stitchRatio);
    } else if (std.metricType === 'reels') {
      perFrame = Math.round((std.avgPerFrame * stitchRatio) * 10) / 10;
    }

    const totalForFrames = std.unit === 'rolls' 
      ? Math.ceil(perFrame * count * 10) / 10 
      : Math.round(perFrame * count);

    return {
      slotNumber: std.slotNumber,
      name: std.name,
      category: std.category,
      metricType: std.metricType,
      unit: std.unit,
      minPerFrame: Math.round(std.minPerFrame * (std.name.includes('Fabric') ? 1 : stitchRatio)),
      maxPerFrame: Math.round(std.maxPerFrame * (std.name.includes('Fabric') ? 1 : stitchRatio)),
      avgPerFrame: perFrame,
      perHeadNote: std.perHeadRule,
      totalForFrames,
      burnRatePerHour: std.burnRatePerHour
    };
  });

  return {
    frameCount: count,
    stitchesPerHead,
    totalStitchesAllHeads: stitchesPerHead * 25,
    speedMode,
    operatingRpm: rpm,
    estimatedHoursPerFrame: hoursPerFrame,
    totalEstimatedHours: totalHours,
    materials
  };
}

/**
 * Builds task material inputs matched with real inventory for a 25-Head Yuemei task
 */
export function buildYuemei25HeadTaskMaterials(
  materials: RawMaterial[],
  frameCount: number = 1,
  stitchesPerHead: number = 125000,
  speedMode: MachineOperatingSpeedMode = 'cutdana',
  operatingRpm?: number
): TaskMaterialInput[] {
  const calculation = calculateYuemei25HeadConsumption(frameCount, stitchesPerHead, speedMode, operatingRpm);

  return calculation.materials.map(calcMat => {
    const matching = materials.find(m => 
      m.category.toLowerCase().includes(calcMat.category.toLowerCase()) ||
      calcMat.category.toLowerCase().includes(m.category.toLowerCase()) ||
      (calcMat.category.includes('Bead') && m.category.toLowerCase().includes('bead')) ||
      (calcMat.category.includes('Sequin') && m.category.toLowerCase().includes('sequin'))
    ) || materials.find(m => m.unit === calcMat.unit) || materials[0];

    const slotProfile = STANDARD_MACHINE_INPUTS_10.find(s => s.slotNumber === calcMat.slotNumber);

    if (matching) {
      return {
        materialId: matching.id,
        materialName: `[Slot ${calcMat.slotNumber}] ${matching.name}`,
        materialCode: matching.code || slotProfile?.defaultCodePrefix || `Y25-${calcMat.slotNumber}`,
        materialCategory: calcMat.category,
        materialSize: matching.size || slotProfile?.suggestedSizes[0],
        materialColorCode: matching.colorCode || slotProfile?.suggestedColors[0]?.hex || '#2563EB',
        materialColorName: matching.colorName || slotProfile?.suggestedColors[0]?.name || 'Standard',
        unit: calcMat.unit,
        estimatedAmountUsed: calcMat.totalForFrames,
        rateOfConsumption: calcMat.burnRatePerHour,
        consumedSoFar: 0,
        unitCost: matching.unitCost || slotProfile?.defaultUnitCost || 50
      };
    }

    return {
      materialId: `temp-yuemei-slot-${calcMat.slotNumber}`,
      materialName: `[Slot ${calcMat.slotNumber}] ${calcMat.name}`,
      materialCode: `Y25-SLOT-${calcMat.slotNumber}`,
      materialCategory: calcMat.category,
      materialSize: slotProfile?.suggestedSizes[0] || 'Standard',
      materialColorCode: slotProfile?.suggestedColors[0]?.hex || '#2563EB',
      materialColorName: slotProfile?.suggestedColors[0]?.name || 'Standard',
      unit: calcMat.unit,
      estimatedAmountUsed: calcMat.totalForFrames,
      rateOfConsumption: calcMat.burnRatePerHour,
      consumedSoFar: 0,
      unitCost: slotProfile?.defaultUnitCost || 50
    };
  });
}


