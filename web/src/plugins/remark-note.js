import { visit } from 'unist-util-visit';

export function remarkNote() {
    return (tree) => {
        visit(tree, (node) => {
            if (
                node.type === 'containerDirective' ||
                node.type === 'leafDirective' ||
                node.type === 'textDirective'
            ) {
                if (node.name !== 'note') return;

                const data = node.data || (node.data = {});
                const attributes = node.attributes || {};
                const title = attributes.title || (node.children[0]?.type === 'paragraph' && node.children[0].data?.directiveLabel ? node.children[0].children[0]?.value : 'Note');

                // If we found the title in the label (:::note[Title]), remove it from children
                if (node.children[0]?.data?.directiveLabel) {
                    node.children.shift();
                }

                data.hName = 'details';
                data.hProperties = {
                    class: 'note-container group',
                };

                // Create the summary element
                const summary = {
                    type: 'paragraph',
                    data: {
                        hName: 'summary',
                        hProperties: {
                            class: 'note-summary',
                        },
                    },
                    children: [
                        {
                            type: 'text',
                            value: title,
                        },
                        {
                            type: 'html',
                            value: `<svg class="note-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`,
                        },
                    ],
                };

                node.children.unshift(summary);
            }
        });
    };
}
