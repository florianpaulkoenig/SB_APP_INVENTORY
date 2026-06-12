import { format } from 'date-fns';
import { de, fr, enUS } from 'date-fns/locale';

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
  sectionFloorPlansShort: string;
  sectionVenuePhotos: string;
  sectionExhibitionPhotos: string;
  sectionProductionOrders: string;
  colDescription: string;
  colMedium: string;
  colDimensions: string;
  colQty: string;
  noItems: string;
  referencePhotos: string;
  exhibitionTypes: Record<string, string>;
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
  exhibitionTypes: {
    exhibition: 'Exhibition',
    art_fair: 'Art Fair',
    solo_show: 'Solo Show',
    group_show: 'Group Show',
    project: 'Project',
    public_project: 'Public Project',
    mural: 'Mural',
  },
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
  exhibitionTypes: {
    exhibition: 'Ausstellung',
    art_fair: 'Kunstmesse',
    solo_show: 'Einzelausstellung',
    group_show: 'Gruppenausstellung',
    project: 'Projekt',
    public_project: 'Öffentliches Projekt',
    mural: 'Wandmalerei',
  },
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
  exhibitionTypes: {
    exhibition: 'Exposition',
    art_fair: 'Foire d\'art',
    solo_show: 'Exposition individuelle',
    group_show: 'Exposition collective',
    project: 'Projet',
    public_project: 'Projet public',
    mural: 'Fresque murale',
  },
};

export const DOSSIER_STRINGS: Record<DossierLanguage, DossierStrings> = { en: EN, de: DE, fr: FR };

const DATE_LOCALES: Record<DossierLanguage, Locale> = { en: enUS, de, fr };

export function formatDateLocalized(dateStr: string, language: DossierLanguage): string {
  try {
    const d = new Date(dateStr);
    return format(d, 'd MMM yyyy', { locale: DATE_LOCALES[language] });
  } catch {
    return dateStr;
  }
}
