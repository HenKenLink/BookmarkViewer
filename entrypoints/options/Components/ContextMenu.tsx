import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';

export interface ContextMenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    divider?: boolean;
    disabled?: boolean;
}

interface ContextMenuProps {
    open: boolean;
    anchorPosition: { top: number; left: number } | null;
    onClose: () => void;
    items: ContextMenuItem[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    open,
    anchorPosition,
    onClose,
    items,
}) => {
    return (
        <Menu
            open={open}
            onClose={onClose}
            anchorReference="anchorPosition"
            anchorPosition={anchorPosition || undefined}
            slotProps={{
                paper: {
                    sx: {
                        minWidth: 200,
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                        borderRadius: 2,
                    },
                },
            }}
        >
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    <MenuItem
                        onClick={() => {
                            item.onClick();
                            onClose();
                        }}
                        disabled={item.disabled}
                        sx={{
                            py: 1.5,
                            px: 2,
                            '&:hover': {
                                backgroundColor: 'primary.light',
                                color: 'primary.contrastText',
                                '& .MuiListItemIcon-root': {
                                    color: 'primary.contrastText',
                                },
                            },
                        }}
                    >
                        {item.icon && (
                            <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                                {item.icon}
                            </ListItemIcon>
                        )}
                        <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{
                                variant: 'body2',
                                fontWeight: 500,
                            }}
                        />
                    </MenuItem>
                    {item.divider && <Divider />}
                </React.Fragment>
            ))}
        </Menu>
    );
};
