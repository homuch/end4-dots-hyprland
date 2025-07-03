// Placeholder for Todo Service
import { createState } from 'ags';

const [_todos, _setTodos] = createState([]); // Array of strings or objects { text: string, done: boolean }

const TodoService = {
    get todos_accessor() { return _todos; },
    get todos() { return _todos.value; },

    add: (text) => {
        if (typeof text === 'string' && text.trim().length > 0) {
            _setTodos(current => [...current, { text: text.trim(), done: false, id: Date.now() }]);
            console.log(`Todo added: ${text.trim()}`);
        }
    },
    remove: (id) => {
        _setTodos(current => current.filter(todo => todo.id !== id));
    },
    toggle: (id) => {
        _setTodos(current => current.map(todo =>
            todo.id === id ? { ...todo, done: !todo.done } : todo
        ));
    },
    // clear: () => { _setTodos([]) }, // If needed

    connect: (signal, callback) => { /* console.log(`FakeTodoService: connect to ${signal}`); */ },
};

export default TodoService;
