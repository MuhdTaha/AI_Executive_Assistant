import React, { useState, useEffect } from 'react';
import { useSupabase } from "../context/SupabaseSessionContext";

// --- UPDATED TYPES ---
interface Task {
    id: string; 
    title: string; 
    notes?: string; 
    due_date?: string; 
    priority?: 'low' | 'med' | 'high';
    status: 'todo' | 'in_progress' | 'done'; 
    created_at: string;
    est_minutes?: number;
    user_id?: string;
    actual_minutes_total: number;
    sessions_count: number;
    updated_at: string;
}

// --- TASKS COMPONENT ---
export default function Tasks() {
    // --- CONTEXT ---
    const { supabase, session, loading } = useSupabase();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [showModal, setShowModal] = useState(false);

    // --- Form fields (structured entry) ---
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [priority, setPriority] = useState<string>("med"); 
    const [estMinutes, setEstMinutes] = useState<number | ''>(''); 

    // --- Plain text input (LLM mode) ---
    const [rawTaskInput, setRawTaskInput] = useState("");

    // --- Modal tab selection ---
    const [activeTab, setActiveTab] = useState<"structured" | "plain">("structured");

    // function to fetch all tasks from backend
    const fetchTasks = async () => {
        if (!session) return;
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: true }
        );

        if (error) console.error(error);
        else setTasks(data as Task[]);
    }

    // function to add task to backend list of tasks
    const createTask = async (e: React.FormEvent) => {
        e.preventDefault();
        // Updated state name
        if (!title.trim() || !session) return;

        const { error } = await supabase.from('tasks').insert({
            // NEW COLUMN NAMES
            title: title,
            notes: notes,
            due_date: dueDate || null,
            priority: priority,
            status: 'todo', // Default status for a new task
            est_minutes: estMinutes || null,
            user_id: session.user.id,
        });

        if (error) console.error(error);
        // reset form and close modal
        else {
            setTitle("");
            setNotes("");
            setDueDate("");
            setPriority("med");
            setEstMinutes('');
            setShowModal(false);
            fetchTasks();
        }
    };

    // function to save task from plain text input (LLM mode)
    const savePlainTextTask = async (e: React.FormEvent) => {
        e.preventDefault();
        // if input is empty or no session, return
        if (!rawTaskInput.trim() || !session) return;

        // For now, save raw input as title and set status to todo
        const { error } = await supabase.from("tasks").insert({
            title: rawTaskInput,
            notes: "Unprocessed text input",
            status: 'todo',
            user_id: session.user.id,
        });

        if (error) console.error(error);
        else {
            setRawTaskInput("");
            setShowModal(false);
            fetchTasks();
        }
    }

    // function to toggle task completion status
    // Now toggles between 'done' and 'todo'
    const toggleTask = async (id: string, currentStatus: 'todo' | 'done') => {
        const newStatus = currentStatus === 'done' ? 'todo' : 'done';
        const { error } = await supabase
            .from('tasks')
            // NEW COLUMN NAME
            .update({ status: newStatus })
            .eq('id', id);

        if (error) console.error(error);
        else fetchTasks();
    };

    // function to delete task from backend list of tasks
    const deleteTask = async (id: string) => {
        const { error } = await supabase
            .from("tasks")
            .delete()
            .eq("id", id);

        if (error) console.error(error);
        else fetchTasks();
    };

    // -- EFFECTS ---
    // fetch tasks when session changes
    useEffect(() => {
        if (!loading && session) {
            fetchTasks();
        }
    }, [loading, session]);

    if (loading) return <p>Loading...</p>;
    if (!session) return <p>Please sign in to view tasks.</p>;

    return (
        <div className="p-4 max-w-lg mx-auto">
            <div className="flex justify-between items-center mb-4">
            </div>

        {/* Task List */}
        <ul className="space-y-2">
            {tasks.map((task) => {
                const isCompleted = task.status === 'done';
                return (
                <li
                    key={task.id}
                    className="flex justify-between items-center p-2 border rounded"
                >
                    <span className={`cursor-pointer ${isCompleted ? "line-through text-gray-500" : ""}`}
                        // Updated to pass task.status
                        onClick={() => toggleTask(task.id, task.status)}
                    >
                        {/* Updated to use task.title */}
                        {task.title}{" "}
                        {task.priority && <span className="text-sm text-gray-400">({task.priority})</span>}
                    </span>

                    <button className="text-red-500" onClick={() => deleteTask(task.id)}>✕</button>
                </li>
                )})}
        </ul>

        {/* Modal Form */}
        {showModal && (
            <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/30 z-50">
                <div className="bg-white p-6 rounded-xl w-full max-w-md relative">
                    <h3 className="text-xl font-bold mb-4">Create Task</h3>
                    
                    {/* Tab Switcher */}
                    <div className="flex mb-4 border-b">
                        <button
                            className={`flex-1 py-2 text-center ${
                                activeTab === "structured" ? "border-b-2 border-blue-500 font-semibold" : "text-gray-500 hover:text-gray-700"
                            }`}
                            onClick={() => setActiveTab("structured")}
                        >
                        Structured Entry
                        </button>
                        <button 
                            className={`flex-1 py-2 text-center ${
                                activeTab === "plain" ? "border-b-2 border-blue-500 font-semibold" : "text-gray-500 hover:text-gray-700"
                            }`}
                            onClick={() => setActiveTab("plain")}
                            >
                        Plain Text Entry
                        </button>
                    </div>

                    {/* --- Structured Entry Form --- */}
                    {activeTab === "structured" && (
                        <form onSubmit={createTask} className="space-y-3">
                            <div>
                                {/* Updated label and state name */}
                                <label className="block mb-1 font-semibold">Title</label>
                                <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="border p-2 w-full rounded"
                                required
                                />
                            </div>
                            <div>
                                {/* Updated label and state name */}
                                <label className="block mb-1 font-semibold">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="border p-2 w-full rounded"
                                    rows={2}
                                />
                            </div>
                            <div>
                                {/* Updated label and state name */}
                                <label className="block mb-1 font-semibold">Estimated Minutes</label>
                                <input
                                    type="number"
                                    value={estMinutes}
                                    // Handle change for number/empty string
                                    onChange={(e) => setEstMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="border p-2 w-full rounded"
                                    placeholder="e.g. 120"
                                />
                            </div>

                            <div>
                                {/* Updated label and state name */}
                                <label className="block mb-1 font-semibold">Due Date (Date only)</label>
                                <input
                                    type="date" // Changed from datetime-local to date
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="border p-2 w-full rounded"
                                />
                            </div>
                            <div>
                                {/* Priority changed to string */}
                                <label className="block mb-1 font-semibold">Priority</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="border p-2 w-full rounded"
                                    required
                                >
                                    <option value="low">Low</option>
                                    <option value="med">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                                    onClick={() => setShowModal(false)}
                                >
                                Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                                >
                                Create
                                </button>
                            </div>
                        </form>
                    )}

                    {/* --- Plain Text Entry Form --- */}
                    {activeTab === "plain" && (
                        <form onSubmit={savePlainTextTask} className="space-y-3">
                            <div>
                                <label className="block mb-1 font-semibold">Task Description</label>
                                <textarea
                                    value={rawTaskInput}
                                    onChange={(e) => setRawTaskInput(e.target.value)}
                                    className="border p-2 w-full rounded"
                                    rows={5}
                                    placeholder='e.g. "Prep for the CS 484 exam by Friday this week, high priority"'
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                                    onClick={() => setShowModal(false)}
                                >
                                Cancel    
                                </button>

                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                                >
                                Save Task
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        )}
    </div>
    );
}