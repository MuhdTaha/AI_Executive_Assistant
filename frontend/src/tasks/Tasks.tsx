import React, { useState, useEffect } from 'react';
import { useSupabase } from "../context/SupabaseSessionContext";

// --- TYPES ---
interface Task {
    id: string;
    name: string;
    description?: string;
    due_at?: string;
    priority?: number;
    completed: boolean;
    created_at: string;
    estimated_duration?: string;
    user_id?: string;
}

// --- TASKS COMPONENT ---
export default function Tasks() {
    // --- CONTEXT ---
    const { supabase, session, loading } = useSupabase();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [showModal, setShowModal] = useState(false);

    // --- Form fields (structured entry) ---
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [dueAt, setDueAt] = useState("");
    const [priority, setPriority] = useState(1);
    const [estimatedDuration, setEstimatedDuration] = useState("");

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
        if (!name.trim() || !session) return;

        const { error } = await supabase.from('tasks').insert({
            name,
            description,
            due_at: dueAt || null,
            priority,
            completed: false,
            estimated_duration: estimatedDuration || null,
            user_id: session.user.id,
        });

        if (error) console.error(error);
        // reset form and close modal
        else {
            setName("");
            setDescription("");
            setDueAt("");
            setPriority(1);
            setEstimatedDuration("");
            setShowModal(false);
            fetchTasks();
        }
    };

    // function to save task from plain text input (LLM mode)
    const savePlainTextTask = async (e: React.FormEvent) => {
        e.preventDefault();
        // if input is empty or no session, return
        if (!rawTaskInput.trim() || !session) return;

        // TODO: Parse rawTaskInput using LLM to extract structured fields
        // for now, we'll just save the entire input as the task name
        const { error } = await supabase.from("tasks").insert({
            name: rawTaskInput, // temporarily using raw input as name
            description: "Unprocessed text input",
            completed: false,
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
    const toggleTask = async (id: string, completed: boolean) => {
        const { error } = await supabase
            .from('tasks')
            .update({ completed: !completed })
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
                <h2 className="text-2xl font-bold">Your Tasks</h2>
                <button
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    onClick={() => setShowModal(true)}
                >
                Create Task
                </button>
            </div>

        {/* Task List */}
        <ul className="space-y-2">
            {tasks.map((task) => (
                <li
                    key={task.id}
                    className="flex justify-between items-center p-2 border rounded"
>
                    <span className={`cursor-pointer ${task.completed ? "line-through text-gray-500" : ""}`}
                        onClick={() => toggleTask(task.id, task.completed)}
                    >
                        {task.name}{" "}
                        {task.priority && <span className="text-sm text-gray-400">(P{task.priority})</span>}
                    </span>

                    <button className="text-red-500" onClick={() => deleteTask(task.id)}>✕</button>
                </li>
            ))}
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
                                <label className="block mb-1 font-semibold">Name</label>
                                <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="border p-2 w-full rounded"
                                required
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="border p-2 w-full rounded"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold">Estimated Duration</label>
                                <input
                                    type="text"
                                    value={estimatedDuration}
                                    onChange={(e) => setEstimatedDuration(e.target.value)}
                                    className="border p-2 w-full rounded"
                                    placeholder="e.g. 2 hours, 45 minutes"
                                />
                            </div>

                            <div>
                                <label className="block mb-1 font-semibold">Due Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={dueAt}
                                    onChange={(e) => setDueAt(e.target.value)}
                                    className="border p-2 w-full rounded"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold">Priority (1-5)</label>
                                <input
                                    type="number"
                                    value={priority}
                                    onChange={(e) => setPriority(Number(e.target.value))}
                                    min={1}
                                    max={5}
                                    className="border p-2 w-full rounded"
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