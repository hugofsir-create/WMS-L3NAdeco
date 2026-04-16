export interface Material {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
}

export interface Movement {
  id?: string;
  type: 'IN' | 'OUT';
  materialSku: string;
  materialName: string;
  quantity: number;
  status: 'APTO' | 'NO_APTO';
  referenceNumber: string; // Numero de carga (IN) or Numero de salida (OUT)
  batch?: string; // Lote
  expiryDate?: string; // Vencimiento
  notes?: string;
  timestamp: any; // Firestore Timestamp
  createdBy: string;
}

export interface Inventory {
  materialSku: string;
  apto: number;
  noApto: number;
  lastUpdated: any;
}
