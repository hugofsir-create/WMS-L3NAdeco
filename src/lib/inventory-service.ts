import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  runTransaction, 
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Material, Movement, Inventory } from '../types';

export const inventoryService = {
  async addMovement(movement: Omit<Movement, 'id' | 'timestamp' | 'createdBy'>) {
    if (!auth.currentUser) throw new Error('User not authenticated');

    const movementData = {
      ...movement,
      timestamp: serverTimestamp(),
      createdBy: auth.currentUser.uid,
    };

    const inventoryRef = doc(db, 'inventory', movement.materialSku);

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
  },

  async bulkInbound(movements: Omit<Movement, 'id' | 'timestamp' | 'createdBy'>[]) {
    // For simplicity in this demo, we'll process them sequentially or in a single large transaction if small enough
    // Firestore transactions have limits (500 ops), so for very large bulk we might need batches
    for (const movement of movements) {
      await this.addMovement(movement);
    }
  },

  async upsertMaterial(material: Material) {
    const materialRef = doc(db, 'materials', material.sku);
    await setDoc(materialRef, material, { merge: true });
  }
};
