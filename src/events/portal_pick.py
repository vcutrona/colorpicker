# Ask the desktop's own colour picker (xdg-desktop-portal Screenshot.PickColor).
# Prints #rrggbb on success. Exit 1 = cancelled by user, 2 = portal not available.
import os, sys
try:
    import gi
    gi.require_version("Gio", "2.0")
    from gi.repository import Gio, GLib
except Exception:
    sys.exit(2)
try:
    bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
    token = "colorpicker%d" % os.getpid()
    sender = bus.get_unique_name()[1:].replace(".", "_")
    path = "/org/freedesktop/portal/desktop/request/%s/%s" % (sender, token)
    loop = GLib.MainLoop()
    result = {"code": 2}

    def on_response(conn, sender_name, obj_path, iface, signal, params):
        code, res = params.unpack()
        result["code"] = code
        if code == 0 and "color" in res:
            r, g, b = res["color"]
            result["hex"] = "#%02x%02x%02x" % tuple(
                max(0, min(255, int(round(c * 255)))) for c in (r, g, b))
        loop.quit()

    bus.signal_subscribe(None, "org.freedesktop.portal.Request", "Response",
                         path, None, Gio.DBusSignalFlags.NONE, on_response)
    bus.call_sync("org.freedesktop.portal.Desktop", "/org/freedesktop/portal/desktop",
                  "org.freedesktop.portal.Screenshot", "PickColor",
                  GLib.Variant("(sa{sv})", ("", {"handle_token": GLib.Variant("s", token)})),
                  None, Gio.DBusCallFlags.NONE, -1, None)
    loop.run()
except Exception as e:
    sys.stderr.write("%s\n" % e)
    sys.exit(2)
if "hex" in result:
    print(result["hex"])
    sys.exit(0)
sys.exit(1 if result["code"] == 1 else 2)
