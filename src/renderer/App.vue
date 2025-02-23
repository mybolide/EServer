<template>
  <ConfigProvider>
    <a-spin :spinning='store.loading' :tip="store.loadingTip+' ...'"
            size='large' style='height: 100vh;'>
      <a-layout>
        <a-row>
          <a-col :span='4' style='height: 100vh;'>
            <SideBar />
          </a-col>
          <a-col :span='20' style='display: flex;flex-direction: column;height: 100vh'>
            <TitleBar />
            <router-view />
          </a-col>
        </a-row>
        <!--  v-if防止不显示就执行modal里面的代码-->
        <user-pwd-modal v-if='userPwdModalShow' v-model:show='userPwdModalShow' :cancel-is-exit='true' />
        <set-language v-if='setLanguageShow' v-model:show='setLanguageShow'></set-language>
      </a-layout>
    </a-spin>
  </ConfigProvider>
</template>

<script setup>
import { isDev, isMacOS, isWindows } from '@/main/utils/utils'
import TitleBar from "./components/TitleBar.vue";
import SideBar from "./components/SideBar.vue";
import App from "@/main/App";
import { computed, provide, reactive, ref, watch } from 'vue'
import MessageBox from "@/renderer/utils/MessageBox";
import UserPwdModal from "@/renderer/components/UserPwdModal.vue";
import Software from "@/main/core/software/Software";
import Service from "@/main/utils/Service";
import {message} from "ant-design-vue";
import DirUtil from "@/main/utils/DirUtil";
import {MAC_USER_CORE_DIR} from "@/main/utils/constant";
import ConfigProvider from "@/renderer/components/Theme/ConfigProvider.vue";
import TrayManage from '@/main/TrayManage'
import { useI18n } from 'vue-i18n'
import SetLanguage from "@/renderer/components/SetLanguage.vue";
import { useMainStore } from '@/renderer/store'

import { t } from "@/shared/utils/i18n";

const store = useMainStore();
const { locale } = useI18n()
const userPwdModalShow = ref(false);
const setLanguageShow = ref(false);

const serverReactive = reactive({ restartFn: undefined, startPhpFpmFn: undefined })

provide('GlobalProvide', { serverReactive });

(async () => {
  try {
    if (await App.initFileExists() && !isDev) {
      await initOrUpdate()
    }

    await store.init()

    store.loadingTip = computed(() => t('Initializing'))
    locale.value = store.settings.Language
    TrayManage.init()
  } catch (error) {
    await MessageBox.error(error.message ?? error, t('errorOccurredDuring', [t('initializing')]))
    App.exit()
  }

  if (isWindows) {
    stopWebService()
  }

})()

async function initOrUpdate() {
  //存在initFile文件的情况下，判断是第一次安装，还是覆盖安装
  if (!await Software.DirExists()) { //目录不存在说明是第一次安装
    if (isMacOS) {
      //调用设置（electron-store）会自动创建USER_CORE_DIR，为了捕捉创建失败的错误，先提前写好创建文件夹的代码。
      await macCreateUserCoreDir()
    }
    setLanguageShow.value = true
    watch(setLanguageShow, async setLanguageShow => {
      if (!setLanguageShow) {
        if (isWindows) {
          await winInit()
        } else if (isMacOS) {
          userPwdModalShow.value = true
        }
      }
    })
  } else {
    //覆盖安装
    if (isMacOS) {
      await update()
    }
  }
}

async function winInit() {
  try {
    store.loading = true;
    await App.init();
    await store.refreshSoftwareList();
    store.loading = false;
  } catch (error) {
    await MessageBox.error(error.message ?? error, t('errorOccurredDuring', [t('initializing')]));
    App.exit();
  }
}

async function macCreateUserCoreDir() {
  try {
    if (!await DirUtil.Exists(MAC_USER_CORE_DIR)) {
      await DirUtil.Create(MAC_USER_CORE_DIR);
    }
  } catch (error) {
    await MessageBox.error(error.message ?? error, t('errorOccurredDuring', [t('initializing')]));
    App.exit();
  }
}

async function update() {
  try {
    store.loading = true;
    await App.update();
    await App.deleteInitFile();
    store.loading = false;
  } catch (error) {
    await MessageBox.error(error.message ?? error, t('errorOccurredDuring', [t('update')]));
    App.exit();
  }
}

async function stopWebService() {
  const IISServiceName = 'W3SVC';
  if (await Service.isRunning(IISServiceName)) {
    await Service.stop(IISServiceName);
    message.info('已自动停止IIS服务');
  }
}

</script>

<style>
</style>
