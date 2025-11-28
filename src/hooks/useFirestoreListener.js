import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Hook to listen to Firestore collection changes in real-time
 * @param {string} collectionPath - Path to collection (e.g., 'restaurants/{id}/orders')
 * @param {object} options - Query options
 * @returns {object} { data, loading, error }
 */
export function useFirestoreCollection(collectionPath, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!collectionPath) {
      setLoading(false);
      return;
    }

    try {
      const pathParts = collectionPath.split('/').filter(Boolean);
      
      // Build collection reference
      // Format: restaurants/{id}/orders -> collection(db, 'restaurants', id, 'orders')
      let ref;
      if (pathParts.length === 1) {
        ref = collection(db, pathParts[0]);
      } else if (pathParts.length === 3) {
        // restaurants/{id}/orders
        ref = collection(db, pathParts[0], pathParts[1], pathParts[2]);
      } else if (pathParts.length === 5) {
        // restaurants/{id}/orders/{orderId}/items
        ref = collection(db, pathParts[0], pathParts[1], pathParts[2], pathParts[3], pathParts[4]);
      } else {
        // Fallback: try to build dynamically
        ref = collection(db, ...pathParts);
      }

      let q = query(ref);

      // Apply filters
      if (options.where) {
        options.where.forEach(({ field, operator, value }) => {
          q = query(q, where(field, operator, value));
        });
      }

      // Apply ordering
      if (options.orderBy) {
        options.orderBy.forEach(({ field, direction = 'asc' }) => {
          q = query(q, orderBy(field, direction));
        });
      }

      // Apply limit
      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setData(items);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Firestore listener error:', err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up Firestore listener:', err);
      setError(err);
      setLoading(false);
    }
  }, [collectionPath, JSON.stringify(options)]);

  return { data, loading, error };
}

/**
 * Hook to listen to a single Firestore document
 */
export function useFirestoreDocument(documentPath) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!documentPath) {
      setLoading(false);
      return;
    }

    try {
      const pathParts = documentPath.split('/').filter(Boolean);
      
      // Build document reference
      // Format: restaurants/{id}/meta/settings -> doc(db, 'restaurants', id, 'meta', 'settings')
      let ref;
      if (pathParts.length === 1) {
        ref = doc(db, pathParts[0]);
      } else if (pathParts.length === 2) {
        ref = doc(db, pathParts[0], pathParts[1]);
      } else if (pathParts.length === 4) {
        // restaurants/{id}/meta/settings
        ref = doc(db, pathParts[0], pathParts[1], pathParts[2], pathParts[3]);
      } else {
        // Fallback: try to build dynamically
        ref = doc(db, ...pathParts);
      }

      const unsubscribe = onSnapshot(
        ref,
        (snapshot) => {
          if (snapshot.exists()) {
            setData({ id: snapshot.id, ...snapshot.data() });
          } else {
            setData(null);
          }
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Firestore listener error:', err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up Firestore listener:', err);
      setError(err);
      setLoading(false);
    }
  }, [documentPath]);

  return { data, loading, error };
}

