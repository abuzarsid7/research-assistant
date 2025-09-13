import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { useRouter } from "next/router";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import layout from "../components/layout";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) router.push("/login");
      else setUser(currentUser);
    });
    return () => unsubscribe();
  }, [router]);

  const handleAddNote = async () => {
    if (!note) return;
    const docRef = await addDoc(collection(db, "notes"), {
      text: note,
      userId: user.uid,
      createdAt: new Date(),
    });
    setNote("");
    fetchNotes();
  };

  const fetchNotes = async () => {
    if (!user) return;
    const q = query(collection(db, "notes"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);
    const userNotes: any[] = [];
    querySnapshot.forEach((doc) => userNotes.push({ id: doc.id, ...doc.data() }));
    setNotes(userNotes);
  };

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  const handleLogout = () => {
    auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-8">
      <div className="w-full max-w-lg flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button onClick={handleLogout} className="bg-red-500 text-white p-2 rounded">
          Logout
        </button>
      </div>
      <div className="w-full max-w-lg flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Add research note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex-1 border p-2 rounded"
        />
        <button onClick={handleAddNote} className="bg-blue-500 text-white p-2 rounded">
          Add
        </button>
      </div>
      <ul className="w-full max-w-lg flex flex-col gap-2">
        {notes.map((n) => (
          <li key={n.id} className="border p-2 rounded">
            {n.text}
          </li>
        ))}
      </ul>
    </div>
  );
}