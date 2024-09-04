# sudo downgrade 'gnome-desktop=~1:43' 'gnome-shell=~43' 'mutter=~43' 'gnome-desktop-common=~1:43' 'gnome-desktop-4=~1:43' 'gdm=~43' 'libgdm=~43' 'gnome-session=~43' 'gnome-settings-deamon=~43' 'gsettings-desktop-schemas=~43'

rm $HOME/.config/mimeapps.list

# xdg-portal
grep gnome /usr/share/xdg-desktop-portal/portals/xapp.portal || sudo sed -e 's/UseIn=/UseIn=GNOME;/g' -i /usr/share/xdg-desktop-portal/portals/xapp.portal

# filebrowser (nemo)
xdg-mime default nemo.desktop inode inode/directory application/x-gnome-saved-search x-scheme-handler/trash
sudo cp /usr/share/dbus-1/services/nemo.FileManager1.service /usr/share/dbus-1/services/org.freedesktop.FileManager1.service

# browser (thorium-browser)
xdg-mime default thorium-browser.desktop text/html x-scheme-handler/http x-scheme-handler/https x-scheme-handler/about x-scheme-handler/unknown x-scheme-handler/chrome application/x-extension-htm application/x-extension-html application/x-extension-shtml application/xhtml+xml application/x-extension-xhtml application/x-extension-xht

# image (gthumb)
xdg-mime default gthumb.desktop image/avif image/bmp image/gif image/jpg image/jpeg image/png image/tiff image/webp

# text (gedit)
xdg-mime default org.gnome.gedit.desktop application/json text/plain application/x-shellscript application/x-zerosize

# video (clapper)
xdg-mime default com.github.rafostar.Clapper.desktop video/3gpp2 video/3gpp video/x-ms-asf video/x-msvideo video/x-f4v video/x-fli video/x-flv video/vnd.fvt video/h261 video/h263 video/h264 video/jpm video/jpeg video/mpeg video/vnd.mpegurl video/x-m4v video/mj2 video/quicktime video/x-sgi-movie video/mp4 video/x-matroska video/ogg video/webm video/vnd.ms-playready.media.pyv video/vnd.vivo video/mp2t video/x-ms-wm video/x-ms-wmv video/x-ms-wmx video/x-ms-wvx

# pdf (xournalpp)
xdg-mime default com.github.xournalpp.xournalpp.desktop application/x-xoj application/x-xojpp application/x-xopp application/x-xopt application/pdf

# archive (FileRoller)
xdg-mime default org.gnome.FileRoller.desktop application/bzip2 application/gzip application/vnd.android.package-archive application/vnd.ms-cab-compressed application/vnd.debian.binary-package application/x-7z-compressed application/x-7z-compressed-tar application/x-ace application/x-alz application/x-apple-diskimage application/x-ar application/x-archive application/x-arj application/x-brotli application/x-bzip-brotli-tar application/x-bzip application/x-bzip-compressed-tar application/x-bzip1 application/x-bzip1-compressed-tar application/x-cabinet application/x-cd-image application/x-compress application/x-compressed-tar application/x-cpio application/x-chrome-extension application/x-deb application/x-ear application/x-ms-dos-executable application/x-gtar application/x-gzip application/x-gzpostscript application/x-java-archive application/x-lha application/x-lhz application/x-lrzip application/x-lrzip-compressed-tar application/x-lz4 application/x-lzip application/x-lzip-compressed-tar application/x-lzma application/x-lzma-compressed-tar application/x-lzop application/x-lz4-compressed-tar application/x-ms-wim application/x-rar application/x-rar-compressed application/x-rpm application/x-source-rpm application/x-rzip application/x-rzip-compressed-tar application/x-tar application/x-tarz application/x-tzo application/x-stuffit application/x-war application/x-xar application/x-xz application/x-xz-compressed-tar application/x-zip application/x-zip-compressed application/x-zstd-compressed-tar application/x-zoo application/zip application/zstd

# fonts (gnome font viewer)
xdg-mime default org.gnome.font-viewer.desktop font/collection font/ttf

# ms-dos-executable (wine)
xdg-mime default wine.desktop application/x-ms-dos-executable

# email
xdg-mime default org.gnome.Geary.desktop x-scheme-handler/mailto

# gnupg
xdg-mime default org.gnome.seahorse.Application.desktop application/pgp-keys application/x-ssh-key application/pkcs12 application/pkcs12+pem application/pkcs7-mime application/pkcs7-mime+pem application/pkcs8 application/pkcs8+pem application/pkix-cert application/pkix-cert+pem application/pkix-crl application/pkix-crl+pem application/x-pem-file application/x-pem-key application/x-pkcs12 application/x-pkcs7-certificates application/x-x509-ca-cert application/x-x509-user-cert application/pkcs10 application/pkcs10+pem application/x-spkac application/x-spkac+base64

# hwp
xdg-mime default hoffice11-hwp.desktop application/vnd.hancom.asv application/vnd.hancom.bak application/vnd.hancom.owpml application/vnd.hancom.hwp application/vnd.hancom.hwt application/vnd.hancom.hml application/vnd.hancom.hwpx application/vnd.hancom.hwtx application/x-hwp application/x-hwt
# application/msword application/vnd.openxmlformats-officedocument.wordprocessingml.document

# figma
xdg-mime default figma-linux.desktop x-scheme-handler/figma

# postman
xdg-mime default Postman.desktop x-scheme-handler/postman
