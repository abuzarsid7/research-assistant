import { useEffect, useState, useRef } from "react";
import { auth, db } from "../lib/firebase";
import { useRouter } from "next/router";
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [loadingNote, setLoadingNote] = useState(false);
  const [loadingReports, setLoadingReports] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");

  const chatEndRef = useRef<null | HTMLDivElement>(null);

  // Check auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) router.push("/login");
      else setUser(currentUser);
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch all chats for the current user
  const fetchChats = async () => {
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const userChats: any[] = [];
    querySnapshot.forEach((doc) => userChats.push({ id: doc.id, ...doc.data() }));
    setChats(userChats);
  };

  // Fetch chats when user is ready
  useEffect(() => {
    if (user) fetchChats();
  }, [user]);

  // Scroll to the bottom of the chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat]);

  const handleNewResearch = () => {
    setActiveChat(null);
  }

  // Handle research query and save chat
  const handleSendMessage = async () => {
    if (!chatInput || !user) return;
  
    setLoadingNote(true);
  
    try {
      const response = await fetch("/api/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: chatInput }),
      });
  
      if (!response.ok) throw new Error("Failed to generate note.");
  
      const { note } = await response.json();
  
      const message = {
        query: chatInput,
        note: note,
        timestamp: new Date()
      };
  
      if (activeChat) {
        // Append to the existing chat
        const chatRef = doc(db, "chats", activeChat.id);
        await updateDoc(chatRef, {
          messages: [...activeChat.messages, message],
        });
        setActiveChat({ ...activeChat, messages: [...activeChat.messages, message] });
      } else {
        // Create a new chat
        const newChat = await addDoc(collection(db, "chats"), {
          userId: user.uid,
          createdAt: serverTimestamp(),
          messages: [message],
        });
        setActiveChat({ id: newChat.id, messages: [message] });
        fetchChats();
      }
  
      setChatInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setLoadingNote(false);
    }
  };
  
  // Generate a report for a specific chat session
  const handleGenerateReport = async (chatId: string, messages: any[]) => {
    setLoadingReports([...loadingReports, chatId]);
  
    try {
      const notes = messages.map(m => m.note);
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
  
      if (!response.ok) throw new Error(`Error: ${response.status}`);
  
      const data = await response.json();
      
      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, { report: data.report });
      
      if(activeChat && activeChat.id === chatId) {
        setActiveChat({ ...activeChat, report: data.report });
      } else {
        fetchChats();
      }
  
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setLoadingReports(loadingReports.filter(id => id !== chatId));
    }
  };
  
  const handleDownloadPdf = (reportContent: string, query: string) => {
    const reportElement = document.createElement('div');
    reportElement.innerHTML = reportContent.replace(/\n/g, '<br />');
    document.body.appendChild(reportElement);
  
    html2canvas(reportElement).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgProps= pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${query.substring(0, 20)}.pdf`);
      document.body.removeChild(reportElement);
    });
  };

  // Logout
  const handleLogout = () => {
    auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex h-screen">
      <div className="w-1/4 bg-gray-100 p-4 overflow-y-auto">
        <button onClick={handleNewResearch} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md w-full mb-4">
          New Research
        </button>
        <h2 className="text-xl font-bold mb-4">Past Research</h2>
        <ul>
          {chats
            .filter(chat => chat.messages && chat.messages.length > 0)
            .map(chat => (
            <li key={chat.id} onClick={() => setActiveChat(chat)} className="p-2 hover:bg-gray-200 cursor-pointer rounded-md">
              {chat.messages[0].query}
            </li>
          ))}
        </ul>
      </div>
      <div className="w-3/4 flex flex-col p-4">
        <div className="flex-1 overflow-y-auto mb-4 p-4 bg-white rounded-lg shadow-inner">
          {activeChat ? (
            <div>
              {activeChat.messages.map((message: any, index: number) => (
                <div key={index} className="mb-4">
                  <p className="font-semibold text-blue-600">You:</p>
                  <p className="text-gray-800 mb-2">{message.query}</p>
                  <p className="font-semibold text-green-600">AI Researcher:</p>
                  <div className="text-gray-800" dangerouslySetInnerHTML={{ __html: message.note.replace(/\n/g, '<br />') }} />
                </div>
              ))}
              <div ref={chatEndRef} />
              {activeChat.report && (
                 <div className="mt-4 p-4 bg-gray-100 rounded-lg border border-gray-300">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Generated Report</h3>
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: activeChat.report.replace(/\n/g, '<br />') }} />
                    <button
                        onClick={() => handleDownloadPdf(activeChat.report, activeChat.messages[0].query)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md mt-4"
                    >
                        Download PDF
                    </button>
                 </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              Select a past research or start a new one.
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter your research topic..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button onClick={handleSendMessage} disabled={loadingNote} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out disabled:opacity-50">
                {loadingNote ? "Sending..." : "Send"}
            </button>
            {activeChat && !activeChat.report && (
                <button
                    onClick={() => handleGenerateReport(activeChat.id, activeChat.messages)}
                    disabled={loadingReports.includes(activeChat.id)}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out disabled:opacity-50"
                >
                    {loadingReports.includes(activeChat.id) ? "Generating..." : "Generate Report"}
                </button>
            )}
        </div>
      </div>
      <button onClick={handleLogout} className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md">
        Logout
      </button>
    </div>
  );
}