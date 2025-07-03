// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
// const { Box, Button, Label, Revealer } = Widget; // To be removed
import { MaterialIcon } from '../.commonwidgets/materialicon.js';
import { TabContainer } from '../.commonwidgets/tabcontainer.js';
import Todo from "../../services/todo.js";
import { setupCursorHover } from '../.widgetutils/cursorhover.js';

const TodoListItem = (task, id, isDone, isEven = false) => {
    const taskName = label({ // Corrected
        hexpand: true,
        xalign: 0,
        wrap: true,
        className: 'txt txt-small sidebar-todo-txt',
        label: task.content,
        selectable: true,
    });
    const actions = box({ // Corrected
        hpack: 'end',
        className: 'spacing-h-5 sidebar-todo-actions',
        children: [
            button({ // Corrected
                vpack: 'center',
                className: 'txt sidebar-todo-item-action',
                child: MaterialIcon(`${isDone ? 'remove_done' : 'check'}`, 'norm', { vpack: 'center' }),
                onClicked: (self) => {
                    const contentWidth = todoContent.get_allocated_width();
                    crosser.toggleClassName('sidebar-todo-crosser-crossed', true);
                    crosser.css = `margin-left: -${contentWidth}px;`;
                    Utils.timeout(200, () => {
                        widgetRevealer.revealChild = false;
                    })
                    Utils.timeout(350, () => {
                        if (isDone)
                            Todo.uncheck(id);
                        else
                            Todo.check(id);
                    })
                },
                setup: setupCursorHover,
            }),
            button({ // Corrected
                vpack: 'center',
                className: 'txt sidebar-todo-item-action',
                child: MaterialIcon('delete_forever', 'norm', { vpack: 'center' }),
                onClicked: () => {
                    const contentWidth = todoContent.get_allocated_width();
                    crosser.toggleClassName('sidebar-todo-crosser-removed', true);
                    crosser.css = `margin-left: -${contentWidth}px;`;
                    Utils.timeout(200, () => {
                        widgetRevealer.revealChild = false;
                    })
                    Utils.timeout(350, () => {
                        Todo.remove(id);
                    })
                },
                setup: setupCursorHover,
            }),
        ]
    })
    const crosser = box({ // Corrected
        className: 'sidebar-todo-crosser',
    });
    const todoContent = box({ // Corrected
        className: 'sidebar-todo-item spacing-h-5',
        children: [
            box({ // Corrected
                vertical: true,
                children: [
                    taskName,
                    actions,
                ]
            }),
            crosser,
        ]
    });
    const widgetRevealer = revealer({ // Corrected
        revealChild: true,
        transition: 'slide_down',
        transitionDuration: userOptions.animations.durationLarge,
        child: todoContent,
    })
    return box({ // Corrected
        homogeneous: true,
        children: [widgetRevealer]
    });
}

const todoItems = (isDone) => scrollable({ // Corrected
    hscroll: 'never',
    vscroll: 'automatic',
    child: box({ // Corrected
        vertical: true,
        className: 'spacing-v-5',
        setup: (self) => self
            .hook(Todo, (self) => {
                self.children = Todo.todo_json.map((task, i) => {
                    if (task.done != isDone) return null;
                    return TodoListItem(task, i, isDone);
                })
                if (self.children.length == 0) {
                    self.homogeneous = true;
                    self.children = [
                        box({ // Corrected
                            hexpand: true,
                            vertical: true,
                            vpack: 'center',
                            className: 'txt txt-subtext',
                            children: [
                                MaterialIcon(`${isDone ? 'checklist' : 'check_circle'}`, 'gigantic'),
                                label({ label: `${isDone ? getString('Finished tasks will go here') : getString('Nothing here!')}` }) // Corrected
                            ]
                        })
                    ]
                }
                else self.homogeneous = false;
            }, 'updated')
        ,
    }),
    setup: (listContents) => {
        const vScrollbar = listContents.get_vscrollbar();
        vScrollbar.get_style_context().add_class('sidebar-scrollbar');
    }
});

const UndoneTodoList = () => {
    const newTaskButton = revealer({ // Corrected
        transition: 'slide_left',
        transitionDuration: userOptions.animations.durationLarge,
        revealChild: true,
        child: button({ // Corrected
            className: 'txt-small sidebar-todo-new',
            halign: 'end',
            vpack: 'center',
            label: getString('+ New task'),
            setup: setupCursorHover,
            onClicked: (self) => {
                newTaskButton.revealChild = false;
                newTaskEntryRevealer.revealChild = true;
                confirmAddTask.revealChild = true;
                cancelAddTask.revealChild = true;
                newTaskEntry.grab_focus();
            }
        })
    });
    const cancelAddTask = revealer({ // Corrected
        transition: 'slide_right',
        transitionDuration: userOptions.animations.durationLarge,
        revealChild: false,
        child: button({ // Corrected
            className: 'txt-norm icon-material sidebar-todo-add',
            halign: 'end',
            vpack: 'center',
            label: 'close',
            setup: setupCursorHover,
            onClicked: (self) => {
                newTaskEntryRevealer.revealChild = false;
                confirmAddTask.revealChild = false;
                cancelAddTask.revealChild = false;
                newTaskButton.revealChild = true;
                newTaskEntry.text = '';
            }
        })
    });
    const newTaskEntry = entry({ // Corrected
        // hexpand: true,
        vpack: 'center',
        className: 'txt-small sidebar-todo-entry',
        placeholderText: getString('Add a task...'),
        onAccept: ({ text }) => {
            if (text == '') return;
            Todo.add(text)
            newTaskEntry.text = '';
        },
        onChange: ({ text }) => confirmAddTask.child.toggleClassName('sidebar-todo-add-available', text != ''),
    });
    const newTaskEntryRevealer = revealer({ // Corrected
        transition: 'slide_right',
        transitionDuration: userOptions.animations.durationLarge,
        revealChild: false,
        child: newTaskEntry,
    });
    const confirmAddTask = revealer({ // Corrected
        transition: 'slide_right',
        transitionDuration: userOptions.animations.durationLarge,
        revealChild: false,
        child: button({ // Corrected
            className: 'txt-norm icon-material sidebar-todo-add',
            halign: 'end',
            vpack: 'center',
            label: 'arrow_upward',
            setup: setupCursorHover,
            onClicked: (self) => {
                if (newTaskEntry.text == '') return;
                Todo.add(newTaskEntry.text);
                newTaskEntry.text = '';
            }
        })
    });
    return box({ // Corrected // The list, with a New button
        vertical: true,
        className: 'spacing-v-5',
        setup: (boxWidget) => { // box renamed to boxWidget
            boxWidget.pack_start(todoItems(false), true, true, 0);
            boxWidget.pack_start(box({ // Corrected
                setup: (self) => {
                    self.pack_start(cancelAddTask, false, false, 0);
                    self.pack_start(newTaskEntryRevealer, true, true, 0);
                    self.pack_start(confirmAddTask, false, false, 0);
                    self.pack_start(newTaskButton, false, false, 0);
                }
            }), false, false, 0);
        },
    });
}

export const TodoWidget = () => TabContainer({ // This is an imported component
    icons: ['format_list_bulleted', 'task_alt'],
    names: [getString('Unfinished'), getString('Done')],
    children: [
        UndoneTodoList(),
        todoItems(true),
    ]
})
