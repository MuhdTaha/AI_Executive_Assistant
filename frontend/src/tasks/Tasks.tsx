import React, { useState, useEffect } from 'react';
import { useSupabase } from "../context/SupabaseSessionContext";

// --- DB row shape for tasks table ---
interface TaskRow {
    id: string;
    user_id: string;
    title: string;
    notes: string | null;
    priority: 'low' | 'med' | 'high' | null;
    due_date: string | null;
    est_minutes: number | null;
    status: string | null;
    created_at: string;
    updated_at: string;
    actual_minute: number | null;
    sessions_coun: number | null;
}

// --- UI Task type ---
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

// --- helpers to convert priority ---
const priorityLabelFromNumber = (n?: number): 'low' | 'med' | 'high' => {
    if (!n || n <= 1) return 'low';
    if (n >= 4) return 'high';
    return 'med';
};

const priorityNumberFromLabel = (p?: string | null): number => {
    if (p === 'high') return 5;
    if (p === 'med') return 3;
    if (p === 'low') return 1;
    return 3;
};

// parse "2 hours 30 minutes" / "45" → minutes
const parseEstimatedMinutes = (text: string | undefined): number | null => {
    if (!text) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;

    let minutes = 0;

    const hourMatch = trimmed.match(/(\d+)\s*(h|hr|hrs|hour|hours)\b/i);
    if (hourMatch) minutes += parseInt(hourMatch[1], 10) * 60;

    const minMatch = trimmed.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/i);
    if (minMatch) minutes += parseInt(minMatch[1], 10);

    if (!minutes) {
        const asNumber = parseInt(trimmed, 10);
        if (!Number.isNaN(asNumber)) minutes = asNumber;
    }

    return minutes || null;
};

// map DB row → UI task
const rowToTask = (row: TaskRow): Task => ({
    id: row.id,
    name: row.title,
    description: row.notes ?? undefined,
    priority: priorityNumberFromLabel(row.priority),
    completed: row.status === 'done',
    created_at: row.created_at,
    user_id: row.user_id,
    due_at: row.due_date ?? undefined,
    estimated_duration:
        row.est_minutes != null ? `${row.est_minutes} min` : undefined,
});

// --- TASKS COMPONENT ---
export default function Tasks() {
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
    const [activeTab, setActiveTab] =
        useState<"structured" | "plain">("structured");

    // --- simple error message display ---
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // 🚨 this is the user_id that satisfies the FK (from public.users)
    const [taskUserId, setTaskUserId] = useState<string | null>(null);

    // function to fetch all tasks from backend
    const fetchTasks = async () => {
        if (!session) return;
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('fetchTasks error', error);
            setErrorMessage(error.message);
        } else {
            const rows = (data ?? []) as TaskRow[];
            setTasks(rows.map(rowToTask));
            // remember a valid user_id from existing rows to satisfy FK
            if (rows.length > 0) {
                setTaskUserId(rows[0].user_id);
            }
            setErrorMessage(null);
        }
    };

    // function to add task to backend list of tasks
    const createTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        console.log("Create clicked with:", {
            name,
            description,
            dueAt,
            priority,
            estimatedDuration,
            taskUserId,
        });

        if (!taskUserId) {
            setErrorMessage(
                'No valid user_id found for tasks table (FK). Make sure the users table has a row first.'
            );
            return;
        }

        const priorityLabel = priorityLabelFromNumber(priority);
        const estMinutes = parseEstimatedMinutes(estimatedDuration);
        const dueDate = dueAt ? dueAt.split("T")[0] : null; // DATE

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                user_id: taskUserId,        // ✅ use FK-safe user id
                title: name,
                notes: description || null,
                priority: priorityLabel,
                due_date: dueDate,
                est_minutes: estMinutes,
                // status will use default 'todo'
            })
            .select('*')
            .single();

        if (error) {
            console.error('createTask error', error);
            setErrorMessage(error.message);
        } else {
            setErrorMessage(null);
            const newTask = rowToTask(data as TaskRow);
            setTasks(prev => [...prev, newTask]);

            // reset form and close modal
            setName("");
            setDescription("");
            setDueAt("");
            setPriority(1);
            setEstimatedDuration("");
            setShowModal(false);
        }
    };

    // function to save task from plain text input (LLM mode)
    const savePlainTextTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rawTaskInput.trim()) return;

        if (!taskUserId) {
            setErrorMessage(
                'No valid user_id found for tasks table (FK). Make sure the users table has a row first.'
            );
            return;
        }

        const { data, error } = await supabase
            .from("tasks")
            .insert({
                user_id: taskUserId,       // ✅ FK-safe id
                title: rawTaskInput,
                notes: "Unprocessed text input",
                priority: "med",
            })
            .select("*")
            .single();

        if (error) {
            console.error("savePlainTextTask error", error);
            setErrorMessage(error.message);
        } else {
            setErrorMessage(null);
            const newTask = rowToTask(data as TaskRow);
            setTasks(prev => [...prev, newTask]);
            setRawTaskInput("");
            setShowModal(false);
        }
    };

    // function to toggle task completion status
    const toggleTask = async (id: string, completed: boolean) => {
        const newStatus = completed ? "todo" : "done";

        const { error } = await supabase
            .from('tasks')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            console.error('toggleTask error', error);
            setErrorMessage(error.message);
        } else {
            setErrorMessage(null);
            setTasks(prev =>
                prev.map(t =>
                    t.id === id ? { ...t, completed: !completed } : t
                )
            );
        }
    };

    // function to delete task from backend list of tasks
    const deleteTask = async (id: string) => {
        const { error } = await supabase
            .from("tasks")
            .delete()
            .eq("id", id);

        if (error) {
            console.error('deleteTask error', error);
            setErrorMessage(error.message);
        } else {
            setErrorMessage(null);
            setTasks(prev => prev.filter(t => t.id !== id));
        }
    };

    // -- EFFECTS ---
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

            {errorMessage && (
                <p className="mb-3 text-sm text-red-500">{errorMessage}</p>
            )}

            {/* Task List */}
            <ul className="space-y-2">
                {tasks.map((task) => (
                    <li
                        key={task.id}
                        className="flex justify-between items-center p-2 border rounded"
                    >
                        <span
                            className={`cursor-pointer ${task.completed ? "line-through text-gray-500" : ""
                                }`}
                            onClick={() => toggleTask(task.id, task.completed)}
                        >
                            {task.name}{" "}
                            {task.priority && (
                                <span className="text-sm text-gray-400">
                                    (P{task.priority})
                                </span>
                            )}
                        </span>

                        <button
                            className="text-red-500"
                            onClick={() => deleteTask(task.id)}
                        >
                            ✕
                        </button>
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
                                className={`flex-1 py-2 text-center ${activeTab === "structured"
                                        ? "border-b-2 border-blue-500 font-semibold"
                                        : "text-gray-500 hover:text-gray-700"
                                    }`}
                                onClick={() => setActiveTab("structured")}
                            >
                                Structured Entry
                            </button>
                            <button
                                className={`flex-1 py-2 text-center ${activeTab === "plain"
                                        ? "border-b-2 border-blue-500 font-semibold"
                                        : "text-gray-500 hover:text-gray-700"
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
                                    <label className="block mb-1 font-semibold">
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="border p-2 w-full rounded"
                                        rows={2}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 font-semibold">
                                        Estimated Duration
                                    </label>
                                    <input
                                        type="text"
                                        value={estimatedDuration}
                                        onChange={(e) => setEstimatedDuration(e.target.value)}
                                        className="border p-2 w-full rounded"
                                        placeholder="e.g. 2 hours, 45 minutes"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-1 font-semibold">
                                        Due Date & Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={dueAt}
                                        onChange={(e) => setDueAt(e.target.value)}
                                        className="border p-2 w-full rounded"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 font-semibold">
                                        Priority (1-5)
                                    </label>
                                    <input
                                        type="number"
                                        value={priority}
                                        onChange={(e) =>
                                            setPriority(Number(e.target.value) || 1)
                                        }
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
                                    <label className="block mb-1 font-semibold">
                                        Task Description
                                    </label>
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
