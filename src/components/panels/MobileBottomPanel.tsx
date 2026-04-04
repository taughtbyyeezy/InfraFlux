import React from 'react';
import { Drawer } from 'vaul';

interface MobileBottomPanelProps {
    children: React.ReactNode;
    onClose: () => void;
    height?: number;
    showDragHandle?: boolean;
    modal?: boolean;
}

export const MobileBottomPanel: React.FC<MobileBottomPanelProps> = ({
    children,
    onClose,
    height = 0.5,
    showDragHandle = true,
    modal = false
}) => {
    return (
        <Drawer.Root
            open
            onOpenChange={(open) => !open && onClose()}
            dismissible={true}
            modal={modal}
        >
            <Drawer.Portal>
                <Drawer.Overlay className="drawer-overlay" />
                <Drawer.Content className="drawer-content"
                    style={{ height: `calc(${height * 100}% + 30px)`, willChange: 'transform' }}
                >
                    {showDragHandle && (
                        <div className="drawer-handle-container">
                            <div className="drawer-handle" />
                        </div>
                    )}
                    <div className="drawer-inner" data-vaul-scrollable>
                        {children}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
};

export default MobileBottomPanel;
