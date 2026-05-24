// src/hooks/useData.ts
import { useState, useCallback } from 'react';
import { Site, Group, GroupWithSites, ExportData } from '../API/http';
import { NavigationClient } from '../API/client';
import { MockNavigationClient } from '../API/mock';

interface UseDataOptions {
  api: NavigationClient | MockNavigationClient;
  onError: (message: string) => void;
}

export function useData({ api, onError }: UseDataOptions) {
  const [groups, setGroups] = useState<GroupWithSites[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const groupsWithSites = await api.getGroupsWithSites();
      setGroups(groupsWithSites);
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      onError('加载数据失败: ' + message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [api, onError]);

  // 更新站点
  const handleSiteUpdate = useCallback(
    async (updatedSite: Site) => {
      try {
        if (updatedSite.id) {
          await api.updateSite(updatedSite.id, updatedSite);
          await fetchData();
        }
      } catch (err) {
        onError('更新站点失败: ' + (err as Error).message);
      }
    },
    [api, fetchData, onError]
  );

  // 删除站点
  const handleSiteDelete = useCallback(
    async (siteId: number) => {
      try {
        await api.deleteSite(siteId);
        await fetchData();
      } catch (err) {
        onError('删除站点失败: ' + (err as Error).message);
      }
    },
    [api, fetchData, onError]
  );

  // 快速移动站点到其他分组
  const handleMoveGroup = useCallback(
    async (siteId: number, targetGroupId: number) => {
      try {
        await api.moveSiteToGroup(siteId, targetGroupId);
        await fetchData();
      } catch (err) {
        onError('移动站点失败: ' + (err as Error).message);
      }
    },
    [api, fetchData, onError]
  );

  // 更新分组
  const handleGroupUpdate = useCallback(
    async (updatedGroup: Group) => {
      try {
        if (updatedGroup.id) {
          await api.updateGroup(updatedGroup.id, updatedGroup);
          await fetchData();
        }
      } catch (err) {
        onError('更新分组失败: ' + (err as Error).message);
      }
    },
    [api, fetchData, onError]
  );

  // 删除分组
  const handleGroupDelete = useCallback(
    async (groupId: number) => {
      try {
        await api.deleteGroup(groupId);
        await fetchData();
      } catch (err) {
        onError('删除分组失败: ' + (err as Error).message);
      }
    },
    [api, fetchData, onError]
  );

  // 创建分组
  const handleCreateGroup = useCallback(
    async (group: Group) => {
      try {
        await api.createGroup(group);
        await fetchData();
      } catch (err) {
        onError('创建分组失败: ' + (err as Error).message);
      }
    },
    [api, fetchData, onError]
  );

  // 创建站点
  const handleCreateSite = useCallback(
    async (site: Site) => {
      try {
        await api.createSite(site);
        await fetchData();
      } catch (err) {
        onError('创建站点失败: ' + (err as Error).message);
      }
    },
    [api, fetchData, onError]
  );

  // 导出数据
  const handleExportData = useCallback(
    async (groups: GroupWithSites[], configs: Record<string, string>) => {
      try {
        setLoading(true);

        const allSites: Site[] = [];
        groups.forEach((group) => {
          if (group.sites && group.sites.length > 0) {
            allSites.push(...group.sites);
          }
        });

        const exportData: ExportData = {
          groups: groups.map((group) => ({
            id: group.id,
            name: group.name,
            order_num: group.order_num,
          })),
          sites: allSites,
          configs,
          version: '1.0',
          exportDate: new Date().toISOString(),
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileName = `导航站备份_${new Date().toISOString().slice(0, 10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
      } catch (err) {
        onError('导出数据失败: ' + (err instanceof Error ? err.message : '未知错误'));
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  // 导入数据
  const handleImportData = useCallback(
    async (importFile: File): Promise<{ success: boolean; message?: string }> => {
      try {
        const fileReader = new FileReader();

        return new Promise((resolve, reject) => {
          fileReader.onload = async (e) => {
            try {
              if (!e.target?.result) {
                throw new Error('读取文件失败');
              }

              const importData = JSON.parse(e.target.result as string);

              if (!importData.groups || !Array.isArray(importData.groups)) {
                throw new Error('导入文件格式错误：缺少分组数据');
              }
              if (!importData.sites || !Array.isArray(importData.sites)) {
                throw new Error('导入文件格式错误：缺少站点数据');
              }
              if (!importData.configs || typeof importData.configs !== 'object') {
                throw new Error('导入文件格式错误：缺少配置数据');
              }

              const result = await api.importData(importData);

              if (!result.success) {
                throw new Error(result.error || '导入失败');
              }

              const stats = result.stats;
              let summary = '导入成功！';
              if (stats) {
                summary = [
                  `导入成功！`,
                  `分组：发现${stats.groups.total}个，新建${stats.groups.created}个，合并${stats.groups.merged}个`,
                  `卡片：发现${stats.sites.total}个，新建${stats.sites.created}个，更新${stats.sites.updated}个，跳过${stats.sites.skipped}个`,
                ].join('\n');
              }

              await fetchData();
              resolve({ success: true, message: summary });
            } catch (err) {
              reject(err);
            }
          };

          fileReader.onerror = () => {
            reject(new Error('读取文件失败'));
          };

          fileReader.readAsText(importFile, 'UTF-8');
        });
      } catch (err) {
        onError('导入数据失败: ' + (err instanceof Error ? err.message : '未知错误'));
        return { success: false };
      }
    },
    [api, fetchData, onError]
  );

  return {
    groups,
    setGroups,
    loading,
    setLoading,
    error,
    fetchData,
    handleSiteUpdate,
    handleSiteDelete,
    handleMoveGroup,
    handleGroupUpdate,
    handleGroupDelete,
    handleCreateGroup,
    handleCreateSite,
    handleExportData,
    handleImportData,
  };
}
