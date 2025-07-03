// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed
import { niceTypes, periodicTable, series } from "./data_periodictable.js";
// const { Box, Button, Icon, Label, Revealer } = Widget; // To be removed. Button, Revealer not used here.

export default () => {
    const ElementTile = (element) => {
        return box({
            vertical: true,
            tooltipText: element.electronConfig ? `${element.electronConfig}` : null,
            className: `cheatsheet-periodictable-${element.type}`,
            children: element.name == '' ? null : [
                box({
                    className: 'padding-left-8 padding-right-8 padding-top-8',
                    children: [
                        label({
                            label: `${element.number}`,
                            className: "cheatsheet-periodictable-elementnum txt-tiny txt-bold",
                        }),
                        box({ hexpand: true }),
                        label({
                            label: `${element.weight}`,
                            className: "txt-smaller",
                        })
                    ]
                }),
                element.icon ? icon({
                    icon: element.icon,
                    className: "txt-hugerass txt-bold",
                }) : label({
                    label: `${element.symbol}`,
                    className: "cheatsheet-periodictable-elementsymbol",
                }),
                label({
                    label: `${element.name}`,
                    className: "txt-tiny",
                })
            ]
        })
    }
    const BoardColor = (type) => box({
        className: 'spacing-h-5',
        children: [
            box({
                homogeneous: true,
                className: `cheatsheet-periodictable-legend-color-wrapper`,
                children: [box({
                    className: `cheatsheet-periodictable-legend-color-${type}`,
                })]
            }),
            label({
                label: `${niceTypes[type]}`,
                className: "txt txt-small",
            })
        ]
    })
    const mainBoard = box({
        hpack: 'center',
        vertical: true,
        className: "spacing-v-3",
        children: periodicTable.map((row, _) => box({ // Rows
            className: "spacing-h-5",
            children: row.map((element, _) => ElementTile(element))
        })),
    });
    const seriesBoard = box({
        hpack: 'center',
        vertical: true,
        className: "spacing-v-3",
        children: series.map((row, _) => box({ // Rows
            className: "spacing-h-5",
            children: row.map((element, _) => ElementTile(element))
        })),
    });
    const legend = box({
        hpack: 'center',
        className: 'spacing-h-20',
        children: [
            BoardColor('metal'),
            BoardColor('nonmetal'),
            BoardColor('noblegas'),
            BoardColor('lanthanum'),
            BoardColor('actinium'),
        ]
    })
    return box({
        vertical: true,
        className: 'spacing-v-20',
        children: [
            mainBoard,
            seriesBoard,
            legend
        ]
    })
}