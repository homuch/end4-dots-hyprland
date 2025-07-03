// import Widget from 'resource:///com/github/Aylur/ags/widget.js'; // To be removed

export const searchItem = ({ materialIconName, name, actionName, content, onActivate, extraClassName = '', ...rest }) => {
    const actionText = revealer({ // Corrected
        revealChild: false,
        transition: "crossfade",
        transitionDuration: userOptions.animations.durationLarge,
        child: label({ // Corrected
            className: 'overview-search-results-txt txt txt-small txt-action',
            label: `${actionName}`,
        })
    });
    const actionTextRevealer = revealer({ // Corrected
        revealChild: false,
        transition: "slide_left",
        transitionDuration: userOptions.animations.durationSmall,
        child: actionText,
    })
    return button({ // Corrected
        className: `overview-search-result-btn txt ${extraClassName}`,
        onClicked: onActivate,
        child: box({ // Corrected
            children: [
                box({ // Corrected
                    vertical: false,
                    children: [
                        label({ // Corrected, assuming MaterialIcon is a type of label or custom component
                            className: `icon-material overview-search-results-icon`,
                            label: `${materialIconName}`,
                        }),
                        box({ // Corrected
                            vertical: true,
                            children: [
                                label({ // Corrected
                                    hpack: 'start',
                                    className: 'overview-search-results-txt txt-smallie txt-subtext',
                                    label: `${name}`,
                                    truncate: "end",
                                }),
                                label({ // Corrected
                                    hpack: 'start',
                                    className: 'overview-search-results-txt txt-norm',
                                    label: `${content}`,
                                    truncate: "end",
                                }),
                            ]
                        }),
                        box({ hexpand: true }), // Corrected
                        actionTextRevealer,
                    ],
                })
            ]
        }),
        setup: (self) => self
            .on('focus-in-event', (button) => {
                actionText.revealChild = true;
                actionTextRevealer.revealChild = true;
            })
            .on('focus-out-event', (button) => {
                actionText.revealChild = false;
                actionTextRevealer.revealChild = false;
            })
        ,
    });
}
