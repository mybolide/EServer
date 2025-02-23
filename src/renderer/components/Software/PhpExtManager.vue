<template>
  <a-modal
      :title="`PHP-${props.phpVersion} ${mt('Extension','ws','Manager')}`"
      v-model:open="visible"
      centered :footer="null" :maskClosable="false">
    <div class="modal-content">
      <a-table
          :columns="columns"
          :data-source="list"
          class="content-table"
          :pagination="false"
          size="middle">
        <template #bodyCell="{ column,record}">
          <template v-if="column.dataIndex === 'operate'">
            <div class="operate">
              <a-button type="primary" @click="install(record)" v-if="!record.isInstalled">
                {{t('Install')}}
              </a-button>
              <a-button type="primary" disabled v-if="record.isInstalled">
                {{t('Installed')}}
              </a-button>
              <a-button type="primary" style='margin-left: 10px' @click="editScript(record)">
                {{mt('Edit','ws','Script')}}
              </a-button>
            </div>
          </template>
        </template>
      </a-table>
      <div class="flex-horizontal-center">
        <a-button type="primary" @click="openExtDir">
          {{mt('Open','ws','Extension','ws','Directory')}}
        </a-button>
      </div>

    </div>
  </a-modal>

  <a-modal
      :title="`PHP-${props.phpVersion} ${mt('Install','ws','Extension')}`"
      v-model:open="taskVisible" @cancel="closeTaskDialog()"
      :bodyStyle="{height:'calc(100vh - 120px)'}" width="100vw"
      centered :footer="null" :maskClosable="false">
    <div class="modal-content">
      <pre class="command-out">{{ msg }}</pre>
      <div :class="`result ${resultCode==0?'result-success':'result-error'}`">{{ result }}</div>
    </div>
  </a-modal>
</template>

<script setup>
import {computed, ref} from "vue";
import {EventEmitter} from "events";
import Installer from "@/main/core/php/extension/Installer";
import Extension from "@/main/core/php/extension/Extension";
import Native from "@/main/utils/Native";
import Php from "@/main/core/php/Php";
import MessageBox from "@/renderer/utils/MessageBox";
import Path from "@/main/utils/Path";
import GetPath from "@/shared/utils/GetPath";
import fs from "fs";
import { isMacOS, isWindows } from '@/main/utils/utils'
import { mt, t } from '@/shared/utils/i18n'
import { createAsyncComponent } from '@/renderer/utils/utils'

const AButton = createAsyncComponent(import('ant-design-vue'), 'Button')
const props = defineProps(['show', 'phpVersion']);

const emit = defineEmits(['update:show']);

const visible = computed({
  get() {
    return props.show;
  },
  set(value) {
    emit('update:show', value);
  }
});

const taskVisible = ref(false);
const msg = ref('');
const result = ref('');
const resultCode = ref(0);


const columns = [
  {
    title: t('Name'),
    width: 180,
    dataIndex: 'name',
  }, {
    title:  t('Operation'),
    dataIndex: 'operate',
    align: 'center',
  }
];

const list = ref([]);


const updateList = async () => {
  list.value = [];
  list.value = await Extension.getList(props.phpVersion);
}

updateList();


const openExtDir = async () => {
  Native.openDirectory(await Php.getExtensionDir(props.phpVersion));
}

let installer;
let eventEmitter;
const install = async (item) => {
  let extVersion = Extension.getVersion(item.name, props.phpVersion);
  if (!extVersion) {
    MessageBox.error(`没有找到php-${props.phpVersion}可用的${item.name}扩展版本！`, '安装出错！');
    return;
  }

  if (isMacOS && Extension.isNeedX64Brew(item.name) && !await Extension.isInstalledX64Brew()) {
    let scriptFilePath = Path.Join(GetPath.getScriptDir(), `x86_64-brew-install.sh`);
    fs.chmodSync(scriptFilePath, '0755');
    MessageBox.error(`安装${item.name}扩展需要先安装 -x86_64 的 Homebrew！\n请复制命令安装\n${scriptFilePath}`, '安装出错！');
    return;
  }

  taskVisible.value = true;
  eventEmitter = new EventEmitter();
  installer = new Installer(item.name, extVersion, props.phpVersion, eventEmitter);
  let commandStr = await installer.install();

  if (!isWindows) {
    msg.value += `执行安装扩展的命令\n${commandStr}\n如果安装失败, 可尝试复制命令自行安装\n\n`;
  }

  eventEmitter.on('phpExt:stdout', (data) => {
    if (taskVisible.value) {
      msg.value += data;
    }
  })

  eventEmitter.on('phpExt:stderr', (data) => {
    if (taskVisible.value) {
      msg.value += data;
    }
  })

  eventEmitter.on('phpExt:exit', (code) => {
    if (taskVisible.value) {
      resultCode.value = code;
      result.value = code == 0 ? '安装完成，请修改 php.ini 后，重启服务生效！' : '安装失败';
    }
  })
}

const editScript = (item) => {
  Native.openTextFile(Extension.getInstallScriptPath(item.name))
}

const closeTaskDialog = () => {
  installer?.stop();
  msg.value = '';
  result.value = '';
  resultCode.value = 0;
  updateList();
}
</script>
<style scoped lang="less">
.flex-horizontal-center {
  display: flex;
  justify-content: center
}

.command-out {
  display: flex;
  flex-direction: column-reverse;
  height: calc(100vh - 200px);
  padding: 10px;
  background: #333;
  color: #fff;
  white-space: pre-wrap;
  word-break: break-all;
  overflow: auto;
  user-select: text;
}

.result {
  height: 20px;
  line-height: 20px;
  text-align: center;
}

.result-success {
  &:extend(.result);
  color: green;
}

.result-error {
  &:extend(.result);
  color: red;
}
</style>
