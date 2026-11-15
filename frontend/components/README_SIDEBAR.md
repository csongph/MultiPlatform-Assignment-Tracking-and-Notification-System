# Shared KMAPS navigation

The sidebar and topbar are rendered by `frontend/js/navigation.js`. Pages include the sidebar/topbar mount points and call `initNavigation()` from their page module. The active item is derived from `location.pathname` and the dashboard `view` query parameter.

To add a menu item, add one object to `SidebarComponent.menuItems` in `navigation.js` with `key`, `label`, `icon`, and `href`. For a new page, add its route to `getActiveNavKey()` so it receives the correct active highlight, add the shared mount points and stylesheet to its HTML, and call `initNavigation()` from its module. The Connect Platforms link remains in the shared footer.
