
// this.wmMap = global.window_manager.connect("map",async(e, actor)=>{
// log(`EVENT_WINDOW_CREATED::
//     id: ${(()=>{try {return actor.meta_window.get_id()} catch{}})()}
//     title: ${actor.meta_window.get_title()}
//     sandboxAppId (flatpak): ${actor.meta_window.get_sandboxed_app_id()}
//     description: ${actor.meta_window.get_description()}
//     root_ancestor: ${actor.meta_window.find_root_ancestor()?.get_id()}
//   wm:
//     wmClass: ${actor.meta_window.get_wm_class()}
//     wmClassInstance: ${actor.meta_window.get_wm_class_instance()}
//     wmRole: ${actor.meta_window.get_role()}
//     wmMutterHint: ${actor.meta_window.get_mutter_hints()}
//     wmType: ${["NORMAL","DESKTOP","DOCK","DIALOG","MODAL_DIALOG","TOOLBAR","MENU","UTILITY","SPLASHSCREEN","DROPDOWN_MENU","POPUP_MENU","TOOLTIP","NOTIFICATION","COMBO","DND","OVERRIDE_OTHER"][actor._windowType]}(${actor._windowType})
//     wmClientType: ${["WAYLAND (0)","X11 (1)"][actor.meta_window.get_client_type()]}
//     wmFrameType: ${["NORMAL 0","DIALOG 1","MODAL_DIALOG 2","UTILITY 3","MENU 4","BORDER 5","ATTACHED 6","LAST 7"][actor.meta_window.get_frame_type()]}
//   gtk:
//     gtkApplicationId: ${actor.meta_window.get_gtk_application_id()}
//     gtkApplicationObjectPath: ${actor.meta_window.get_gtk_application_object_path()}
//     gtkObjectPath: ${actor.meta_window.get_gtk_window_object_path()}
//     gtkMenubarObjectPath: ${actor.meta_window.get_gtk_menubar_object_path()}
//     gtkAppMenuObjectPath: ${get_gtk_app_menu_object_path()}
//     gtkUniqueBusName: ${actor.meta_window.get_gtk_unique_bus_name()}
//     gtkThemeVariant: ${actor.meta_window.get_gtk_theme_variant()}`)
// })
