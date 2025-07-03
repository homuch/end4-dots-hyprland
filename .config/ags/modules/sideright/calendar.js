import GLib from 'gi://GLib';
import app from 'ags/gtk4/app'; // Added app import
// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
// const { Box, Button, Label, Overlay } = Widget; // To be removed

import { MaterialIcon } from '../.commonwidgets/materialicon.js';
import { setupCursorHover } from '../.widgetutils/cursorhover.js';

import Todo from "../../services/todo.js";
import { TodoWidget } from "./todolist.js";
import { getCalendarLayout } from "./calendar_layout.js";

const AGS_CONFIG_FILE = `${app.configDir}/user_options.jsonc`; // Corrected to app
let calendarJson = getCalendarLayout(undefined, true);
let monthshift = 0;

function getDateInXMonthsTime(x) {
    var currentDate = new Date(); // Get the current date
    var targetMonth = currentDate.getMonth() + x; // Calculate the target month
    var targetYear = currentDate.getFullYear(); // Get the current year

    // Adjust the year and month if necessary
    targetYear += Math.floor(targetMonth / 12);
    targetMonth = (targetMonth % 12 + 12) % 12;

    // Create a new date object with the target year and month
    var targetDate = new Date(targetYear, targetMonth, 1);

    // Set the day to the last day of the month to get the desired date
    // targetDate.setDate(0);

    return targetDate;
}

const weekDays = [ // MONDAY IS THE FIRST DAY OF THE WEEK :HESRIGHTYOUKNOW:
    { day: getString('Mo'), today: 0 },
    { day: getString('Tu'), today: 0 },
    { day: getString('We'), today: 0 },
    { day: getString('Th'), today: 0 },
    { day: getString('Fr'), today: 0 },
    { day: getString('Sa'), today: 0 },
    { day: getString('Su'), today: 0 },
]

const CalendarDay = (day, today) => button({ // Corrected
    className: `sidebar-calendar-btn ${today == 1 ? 'sidebar-calendar-btn-today' : (today == -1 ? 'sidebar-calendar-btn-othermonth' : '')}`,
    child: overlay({ // Corrected
        child: box({}), // Corrected
        overlays: [label({ // Corrected
            hpack: 'center',
            className: 'txt-smallie txt-semibold sidebar-calendar-btn-txt',
            label: String(day),
        })],
    })
})

const CalendarWidget = () => {
    const calendarMonthYear = button({ // Corrected
        className: 'txt txt-large sidebar-calendar-monthyear-btn',
        onClicked: () => shiftCalendarXMonths(0),
        setup: (button) => {
            button.label = `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`;
            setupCursorHover(button);
        }
    });
    const addCalendarChildren = (boxWidget, calendarJson) => { // box renamed to boxWidget
        const children = boxWidget.get_children();
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            child.destroy();
        }
        boxWidget.children = calendarJson.map((row, i) => box({ // Corrected
            className: 'spacing-h-5',
            children: row.map((day, i) => CalendarDay(day.day, day.today)),
        }))
    }
    function shiftCalendarXMonths(x) {
        if (x == 0) monthshift = 0;
        else monthshift += x;
        var newDate;
        if (monthshift == 0) newDate = new Date();
        else newDate = getDateInXMonthsTime(monthshift);

        calendarJson = getCalendarLayout(newDate, (monthshift == 0));
        calendarMonthYear.label = `${monthshift == 0 ? '' : '• '}${newDate.toLocaleString('default', { month: 'long' })} ${newDate.getFullYear()}`;
        addCalendarChildren(calendarDays, calendarJson);
    }
    const calendarHeader = box({ // Corrected
        className: 'spacing-h-5 sidebar-calendar-header',
        setup: (boxWidget) => { // box renamed to boxWidget
            boxWidget.pack_start(calendarMonthYear, false, false, 0);
            boxWidget.pack_end(box({ // Corrected
                className: 'spacing-h-5',
                children: [
                    button({ // Corrected
                        className: 'sidebar-calendar-monthshift-btn',
                        onClicked: () => shiftCalendarXMonths(-1),
                        child: MaterialIcon('chevron_left', 'norm'),
                        setup: setupCursorHover,
                    }),
                    button({ // Corrected
                        className: 'sidebar-calendar-monthshift-btn',
                        onClicked: () => shiftCalendarXMonths(1),
                        child: MaterialIcon('chevron_right', 'norm'),
                        setup: setupCursorHover,
                    })
                ]
            }), false, false, 0);
        }
    })
    const calendarDays = box({ // Corrected
        hexpand: true,
        vertical: true,
        className: 'spacing-v-5',
        setup: (boxWidget) => { // box renamed to boxWidget
            addCalendarChildren(boxWidget, calendarJson);
        }
    });
    return eventBox({ // Corrected (assuming eventBox is intrinsic)
        onScrollUp: () => shiftCalendarXMonths(-1),
        onScrollDown: () => shiftCalendarXMonths(1),
        child: box({ // Corrected
            hpack: 'center',
            children: [
                box({ // Corrected
                    hexpand: true,
                    vertical: true,
                    className: 'spacing-v-5',
                    children: [
                        calendarHeader,
                        box({ // Corrected
                            homogeneous: true,
                            className: 'spacing-h-5',
                            children: weekDays.map((day, i) => CalendarDay(day.day, day.today))
                        }),
                        calendarDays,
                    ]
                })
            ]
        })
    });
};

export const ModuleCalendar = () => {
    const defaultShown = 'calendar';
    const navrailButton = (stackItemName, icon, name) => button({ // Corrected
        className: 'button-minsize sidebar-navrail-btn txt-small spacing-h-5',
        onClicked: (button) => {
            contentStack.shown = stackItemName;
            const kids = button.get_parent().get_children();
            for (let i = 0; i < kids.length; i++) {
                if (kids[i] != button) kids[i].toggleClassName('sidebar-navrail-btn-active', false);
                else button.toggleClassName('sidebar-navrail-btn-active', true);
            }
        },
        child: box({ // Corrected
            className: 'spacing-v-5',
            vertical: true,
            children: [
                label({ // Corrected
                    className: `txt icon-material txt-hugeass`,
                    label: icon,
                }),
                label({ // Corrected
                    label: name,
                    className: 'txt txt-smallie',
                }),
            ]
        }),
        setup: (button) => Utils.timeout(1, () => {
            setupCursorHover(button);
            button.toggleClassName('sidebar-navrail-btn-active', defaultShown === stackItemName);
        })
    });
    const navrail = box({ // Corrected
        vpack: 'center',
        homogeneous: true,
        vertical: true,
        className: 'sidebar-navrail spacing-v-10',
        children: [
            navrailButton('calendar', 'calendar_month', getString('Calendar')),
            navrailButton('todo', 'done_outline', getString('To Do')),
        ]
    });
    const contentStack = stack({ // Corrected
        hexpand: true,
        children: {
            'calendar': CalendarWidget(),
            'todo': TodoWidget(),
        },
        transition: 'slide_up_down',
        transitionDuration: userOptions.animations.durationLarge,
        setup: (stack) => Utils.timeout(1, () => {
            stack.shown = defaultShown;
        })
    })

    const CollapseButtonIcon = (collapse) => MaterialIcon(collapse ? 'expand_more' : 'expand_less', 'norm');
    const CollapseButton = (collapse) => {
        const collapseButtonIcon = CollapseButtonIcon(collapse);
        return button({ // Corrected
            hpack: 'start',
            vpack: 'start',
            className: 'margin-top-5 margin-left-5 margin-bottom-5',
            onClicked: () => {
                mainStack.shown = (mainStack.shown == 'expanded') ? 'collapsed' : 'expanded';
                Utils.execAsync(['bash', '-c', `${app.configDir}/scripts/ags/agsconfigurator.py \
                    --key "sidebar.calendar.expandByDefault" \
                    --value ${!userOptions.sidebar.calendar.expandByDefault} \
                    --file ${AGS_CONFIG_FILE}`
                ]).catch(print);

            },
            setup: setupCursorHover,
            child: box({ // Corrected
                className: 'sidebar-calendar-btn-arrow txt',
                homogeneous: true,
                children: [collapseButtonIcon],
            }),
            tooltipText: collapse ? getString('Collapse calendar') : getString('Expand calendar'),
        })
    }
    const date = Variable('', {
        poll: [
            userOptions.time.interval,
            () => GLib.DateTime.new_now_local().format(userOptions.time.calendarDateFormat),
        ],
    })

    const collapsedWidget = box({ // Corrected
        className: 'spacing-h-5',
        children: [
            CollapseButton(false),
            label({ // Corrected
                vpack: 'center',
                className: 'txt txt-small sidebar-calendar-collapsed-pill',
                label: date.bind(),
            }),
            label({ // Corrected
                vpack: 'center',
                className: 'txt txt-small sidebar-calendar-collapsed-pill',
                label: `${Todo.todo_json.length} ${getString('To do tasks')}`,
                setup: (self) => self.hook(Todo, (self) => {
                    self.label = `${Todo.todo_json.length} ${getString('To do tasks')}`
                }, 'updated')
            }),
        ]
    })

    const mainStack = stack({ // Corrected
        className: 'sidebar-group',
        homogeneous: false,
        children: {
            'collapsed': collapsedWidget,
            'expanded': box({ // Corrected
                className: 'spacing-h-5',
                children: [
                    overlay({ // Corrected
                        child: navrail,
                        overlays: [CollapseButton(true)],
                    }),
                    contentStack
                ]
            }),
        },
        transition: 'slide_up_down',
        transitionDuration: userOptions.animations.durationLarge,
        shown: userOptions.sidebar.calendar.expandByDefault ? 'expanded' : 'collapsed',
    })

    return mainStack;
}

