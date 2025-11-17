import { collection, addDoc, getDocs, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Group {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  totalPooled: number;
  status: 'active' | 'closed';
  createdAt: any;
  members: any[];
}

export const createGroup = async (groupData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'groups'), {
      ...groupData,
      createdAt: new Date(),
      totalPooled: 0,
      status: 'active'
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

export const getUserGroups = (userId: string, callback: (groups: Group[]) => void) => {
  const q = query(collection(db, 'groups'), where('createdBy', '==', userId));
  
  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Group[];
    callback(groups);
  });
};

export const getGroupById = async (groupId: string) => {
  try {
    const groupDoc = await getDocs(query(collection(db, 'groups'), where('__name__', '==', groupId)));
    if (!groupDoc.empty) {
      const doc = groupDoc.docs[0];
      const groupData = { id: doc.id, ...doc.data() } as Group;
      
      // Fetch group members
      const membersQuery = query(
        collection(db, 'group_members'),
        where('group_id', '==', groupId)
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      const members = membersSnapshot.docs.map(memberDoc => ({
        id: memberDoc.id,
        name: memberDoc.data().display_name,
        email: memberDoc.data().email,
        upiId: memberDoc.data().upi_id,
        role: memberDoc.data().role,
        userId: memberDoc.data().user_id
      }));
      
      groupData.members = members;
      return groupData;
    }
    return null;
  } catch (error) {
    console.error('Error getting group:', error);
    return null;
  }
};