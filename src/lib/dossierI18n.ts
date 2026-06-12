export type DossierLanguage = 'en' | 'de' | 'fr';

export interface DossierStrings {
  dossierTag: string;
  labelCategory: string;
  labelVenue: string;
  labelLocation: string;
  labelDates: string;
  labelCreatedBy: string;
  sectionExhibitionText: string;
  sectionFloorPlans: string;
  sectionFloorPlansShort: string; // used in "(1/3)" style title
  sectionVenuePhotos: string;
  sectionExhibitionPhotos: string;
  sectionProductionOrders: string;
  colDescription: string;
  colMedium: string;
  colDimensions: string;
  colQty: string;
  noItems: string;
  referencePhotos: string;
}

const EN: DossierStrings = {
  dossierTag: 'Dossier',
  labelCategory: 'Category',
  labelVenue: 'Venue',
  labelLocation: 'Location',
  labelDates: 'Dates',
  labelCreatedBy: 'Created by',
  sectionExhibitionText: 'Exhibition Text',
  sectionFloorPlans: 'Floor Plans / 3D Model',
  sectionFloorPlansShort: 'Floor Plans / 3D Model',
  sectionVenuePhotos: 'Venue Photos',
  sectionExhibitionPhotos: 'Exhibition Photos',
  sectionProductionOrders: 'Production Orders',
  colDescription: 'Description',
  colMedium: 'Medium',
  colDimensions: 'Dimensions',
  colQty: 'Qty',
  noItems: 'No items',
  referencePhotos: 'Reference Photos',
};

const DE: DossierStrings = {
  dossierTag: 'Dossier',
  labelCategory: 'Kategorie',
  labelVenue: 'Ausstellungsort',
  labelLocation: 'Ort',
  labelDates: 'Zeitraum',
  labelCreatedBy: 'Erstellt von',
  sectionExhibitionText: 'Ausstellungstext',
  sectionFloorPlans: 'Grundrisse / 3D-Modell',
  sectionFloorPlansShort: 'Grundrisse / 3D-Modell',
  sectionVenuePhotos: 'Location-Fotos',
  sectionExhibitionPhotos: 'Ausstellungsfotos',
  sectionProductionOrders: 'Produktionsaufträge',
  colDescription: 'Beschreibung',
  colMedium: 'Medium',
  colDimensions: 'Maße',
  colQty: 'Anz.',
  noItems: 'Keine Positionen',
  referencePhotos: 'Referenzfotos',
};

const FR: DossierStrings = {
  dossierTag: 'Dossier',
  labelCategory: 'Catégorie',
  labelVenue: 'Lieu',
  labelLocation: 'Localisation',
  labelDates: 'Dates',
  labelCreatedBy: 'Créé par',
  sectionExhibitionText: "Texte d'exposition",
  sectionFloorPlans: 'Plans / Modèle 3D',
  sectionFloorPlansShort: 'Plans / Modèle 3D',
  sectionVenuePhotos: 'Photos du lieu',
  sectionExhibitionPhotos: "Photos d'exposition",
  sectionProductionOrders: 'Ordres de production',
  colDescription: 'Description',
  colMedium: 'Médium',
  colDimensions: 'Dimensions',
  colQty: 'Qté',
  noItems: 'Aucun élément',
  referencePhotos: 'Photos de référence',
};

export const DOSSIER_STRINGS: Record<DossierLanguage, DossierStrings> = { en: EN, de: DE, fr: FR };
