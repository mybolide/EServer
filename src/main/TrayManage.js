import { electronRequireMulti } from '@/main/utils/electron'
import { APP_NAME } from '@/shared/utils/constant'
const { app, Tray, Menu, nativeImage, getGlobal } = electronRequireMulti()
import { isMacOS } from '@/main/utils/utils'
import {t}  from '@/shared/utils/i18n'
import Path from '@/main/utils/Path'
import GetPath from '@/shared/utils/GetPath'

export default class TrayManage {
    static #_instance;
    static init() {
        let iconPath = this.getIconPath();
        let icon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 })
        icon.setTemplateImage(true)
        let tray = new Tray(icon)
        const contextMenu = this.getContextMenu();
        tray.setToolTip(APP_NAME)
        tray.setContextMenu(contextMenu)
        tray.on('click', () => this.showMainWindow())
        this.#_instance = tray;
    }

    static getContextMenu() {
        return Menu.buildFromTemplate([
            {
                label: t('Open'),
                click: () => this.showMainWindow()
            },
            {
                label: t('Exit'),
                click: () => app.quit()
            }
        ])
    }

    static showMainWindow() {
        const electron = getGlobal('electron')
        electron.mainWindow.show()
    }

    static refresh() {
        this.#_instance.setContextMenu(this.getContextMenu())
    }

    static getIconPath() {
        if (isMacOS) {
            return Path.Join(GetPath.getStaticDir(), 'img/icons/icon-tray-Mac.png')
        }
        return Path.Join(GetPath.getStaticDir(), 'img/icons/icon-tray.png')
    }
}
