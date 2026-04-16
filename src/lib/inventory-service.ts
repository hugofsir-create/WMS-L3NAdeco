import { 
  collection, 
  doc, 
  setDoc, 
  runTransaction, 
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Material, Movement, Inventory } from '../types';

export const inventoryService = {
  async addMovement(movement: Omit<Movement, 'id' | 'timestamp' | 'createdBy'>) {
    const movementData = {
      type: movement.type,
      materialSku: movement.materialSku,
      materialName: movement.materialName,
      quantity: movement.quantity,
      status: movement.status,
      referenceNumber: movement.referenceNumber,
      batch: movement.batch || '',
      notes: movement.notes || '',
      timestamp: serverTimestamp(),
      createdBy: auth.currentUser?.uid || 'anonymous',
    };

    const inventoryRef = doc(db, 'inventory', movement.materialSku);

    try {
      await runTransaction(db, async (transaction) => {
        const inventoryDoc = await transaction.get(inventoryRef);
        
        let currentInventory: Inventory;
        if (!inventoryDoc.exists()) {
          currentInventory = {
            materialSku: movement.materialSku,
            apto: 0,
            noApto: 0,
            lastUpdated: serverTimestamp(),
          };
        } else {
          currentInventory = inventoryDoc.data() as Inventory;
        }

        const quantity = movement.quantity;
        const isApto = movement.status === 'APTO';

        if (movement.type === 'IN') {
          if (isApto) currentInventory.apto += quantity;
          else currentInventory.noApto += quantity;
        } else {
          // OUT
          if (isApto) {
            if (currentInventory.apto < quantity) throw new Error('Stock insuficiente (Apto)');
            currentInventory.apto -= quantity;
          } else {
            if (currentInventory.noApto < quantity) throw new Error('Stock insuficiente (No Apto)');
            currentInventory.noApto -= quantity;
          }
        }

        currentInventory.lastUpdated = serverTimestamp();

        // Add movement record
        const movementsRef = collection(db, 'movements');
        const newMovementRef = doc(movementsRef);
        transaction.set(newMovementRef, movementData);

        // Update inventory
        transaction.set(inventoryRef, currentInventory);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `inventory/${movement.materialSku}`);
    }
  },

  async bulkInbound(movements: Omit<Movement, 'id' | 'timestamp' | 'createdBy'>[]) {
    for (const movement of movements) {
      await this.addMovement(movement);
    }
  },

  async upsertMaterial(material: Material) {
    try {
      const materialRef = doc(db, 'materials', material.sku);
      await setDoc(materialRef, {
        sku: material.sku,
        name: material.name,
        description: material.description || '',
        category: material.category || '',
        unit: material.unit
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `materials/${material.sku}`);
    }
  }
};
