import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Clock, Copy, Download } from 'lucide-react';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import DownloadProgress from '@/components/DownloadProgress';
import Toolbar from '@/components/Toolbar';
import { AppLayout, Sidebar, TitleBar } from '@/components/layouts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchModelDetail } from '@/services/modelDetailApi';
import { modelService } from '@/services/modelService';
import { useDownloadStore } from '@/stores/downloadStore';
import { preprocessImageUrls } from '@/utils/imageUtils';

const ModelDetail = () => {
  const { modelName } = useParams<{ modelName: string }>();
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const { t } = useTranslation();
  const [showAllTags, setShowAllTags] = useState(false);
  const { startDownload } = useDownloadStore();

  const {
    data: modelDetail,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['modelDetail', modelName],
    queryFn: () => fetchModelDetail(modelName!),
    enabled: !!modelName,
  });

  // Get local models list to check if models are already installed
  const { data: localModels = [] } = useQuery({
    queryKey: ['localModels'],
    queryFn: () => modelService.fetchLocalModels(),
    staleTime: 30000, // Cache for 30 seconds
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'thinking':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'vision':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'embedding':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'tools':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default:
        return 'bg-white/10 text-white/70 border-white/20';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Check if a model is already installed locally
  const isModelInstalled = (modelName: string): boolean => {
    return localModels.some(localModel => localModel.name === modelName);
  };

  const handleDownload = async (tagName: string, size: number) => {
    if (!tagName) {
      // Model tag name is not available
      toast({
        title: 'Error',
        description: 'Cannot download model without a tag name.',
        variant: 'destructive',
      });
      return;
    }
    await startDownload({ name: tagName, size });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-white/70'>Loading...</div>
        </div>
      );
    }

    if (error || !modelDetail) {
      return (
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-red-300'>Loading failed</div>
        </div>
      );
    }

    const { data: model } = modelDetail;
    const tagsToShow = showAllTags ? model.all_tags : model.tags;

    const latestTag = model.tags.find(tag => tag.tag === 'latest') || model.tags[0];

    return (
      <div className='flex-1 overflow-y-auto p-6 custom-scrollbar'>
        <div className='max-w-none mx-auto space-y-6'>
          {/* Model basic information */}
          <Card className='bg-white/5 border-white/20'>
            <CardHeader>
              <div className='flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4'>
                <div className='flex-1 min-w-0'>
                  <CardTitle className='text-xl lg:text-2xl font-bold text-white mb-2 break-words'>
                    {model.name}
                  </CardTitle>
                  <div className='flex flex-wrap items-center gap-2 lg:gap-4 text-white/70 text-sm mb-4'>
                    <span className='flex items-center gap-1'>
                      <Download size={14} />
                      {formatNumber(model.pulls)} Downloads
                    </span>
                    <span className='flex items-center gap-1'>
                      <Clock size={14} />
                      Updated {model.updated_at}
                    </span>
                  </div>
                </div>
                <div className='flex flex-col gap-3 shrink-0'>
                  <div className='flex items-center gap-2 bg-black/5 px-3 py-2 rounded-lg min-w-0 w-full'>
                    <code className='text-white text-sm flex-1 truncate'>{model.ollama_cmd}</code>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => copyToClipboard(model.ollama_cmd)}
                      className='h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10 shrink-0 ml-2'
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                  {isModelInstalled(latestTag.name) ? (
                    <Button
                      size='sm'
                      disabled
                      className={`bg-gradient-to-r ${currentTheme.colors.primary}/30 text-white/70 border-0 px-4 py-2 rounded-lg font-medium shadow-lg transition-all duration-200 whitespace-nowrap cursor-not-allowed min-w-[120px]`}
                    >
                      <Check size={14} className='mr-2' />
                      {t('localModels.installed')}
                    </Button>
                  ) : (
                    <Button
                      size='sm'
                      onClick={() => handleDownload(latestTag.name, Number(latestTag.size) || 0)}
                      className={`bg-gradient-to-r ${currentTheme.colors.primary} text-white border-0 hover:opacity-90 px-4 py-2 rounded-lg font-medium shadow-lg transition-all duration-200 whitespace-nowrap min-w-[120px]`}
                    >
                      <Download size={14} className='mr-2' />
                      {t('models.installNow')}
                    </Button>
                  )}
                </div>
              </div>

              <p className='text-white/90 text-base leading-relaxed'>{model.summary}</p>

              <div className='flex flex-wrap gap-2 mt-4'>
                {model.types.map(type => (
                  <Badge key={type} className={`${getTypeColor(type)} border`}>
                    {type}
                  </Badge>
                ))}
              </div>

              <div className='flex flex-wrap gap-2 mt-2'>
                {model.sizes.map(size => (
                  <Badge key={size} className='bg-white/10 text-white/70 border-white/20'>
                    {size}
                  </Badge>
                ))}
              </div>
            </CardHeader>
          </Card>

          {/* Model versions */}
          <Card className='bg-white/5 border-white/20'>
            <CardHeader>
              <div className='flex justify-between items-center'>
                <CardTitle className='text-white'>Models</CardTitle>
                {model.all_tags.length > model.tags.length && (
                  <Button
                    variant='ghost'
                    onClick={() => setShowAllTags(!showAllTags)}
                    className='text-white/70 hover:text-white hover:bg-white/10'
                  >
                    {showAllTags ? 'Show main versions' : 'View all →'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className='table-container'>
                <Table className='min-w-full'>
                  <TableHeader>
                    <TableRow className='border-white/20'>
                      <TableHead className='text-white/90 min-w-[150px]'>Name</TableHead>
                      <TableHead className='text-white/90 min-w-[80px]'>Size</TableHead>
                      <TableHead className='text-white/90 min-w-[80px]'>Context</TableHead>
                      <TableHead className='text-white/90 min-w-[80px]'>Input</TableHead>
                      <TableHead className='text-white/90 text-right min-w-[120px]'>
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tagsToShow.map((tag, index) => (
                      <TableRow
                        key={`${tag.name}-${tag.tag}-${index}`}
                        className='border-white/10 hover:bg-white/5'
                      >
                        <TableCell className='min-w-[150px]'>
                          <div className='flex items-center gap-2'>
                            <span className='font-medium text-white break-words'>{tag.name}</span>
                            {tag.tag === 'latest' && (
                              <Badge className='bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs shrink-0'>
                                latest
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='text-white/70 min-w-[80px]'>{tag.size}</TableCell>
                        <TableCell className='text-white/70 min-w-[80px]'>{tag.context}</TableCell>
                        <TableCell className='text-white/70 min-w-[80px]'>
                          {tag.input_type}
                        </TableCell>
                        <TableCell className='text-right min-w-[120px]'>
                          <div className='flex items-center justify-end gap-2'>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => copyToClipboard(`ollama run ${tag.name}`)}
                              className='h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10'
                            >
                              <Copy size={14} />
                            </Button>
                            {isModelInstalled(tag.name) ? (
                              <Button
                                size='sm'
                                disabled
                                className={`bg-gradient-to-r ${currentTheme.colors.primary}/30 text-white/70 border-0 px-3 py-1 text-xs cursor-not-allowed min-w-[90px]`}
                              >
                                <Check size={12} className='mr-1' />
                                {t('localModels.installed')}
                              </Button>
                            ) : (
                              <Button
                                size='sm'
                                onClick={() => handleDownload(tag.name, Number(tag.size) || 0)}
                                className={`bg-gradient-to-r ${currentTheme.colors.primary} text-white border-0 hover:opacity-90 px-3 py-1 text-xs min-w-[90px]`}
                              >
                                <Download size={12} className='mr-1' />
                                {t('models.install')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Model description */}
          {model.description && (
            <Card className='bg-white/5 border-white/20'>
              <CardHeader>
                <CardTitle className='text-white'>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className='text-white/90 prose prose-invert max-w-none'
                  dangerouslySetInnerHTML={{
                    __html: preprocessImageUrls(model.description),
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Detailed documentation */}
          {model.detail_html && (
            <Card className='bg-white/5 border-white/20'>
              <CardHeader>
                <CardTitle className='text-white'>Readme</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className='text-white/90 max-w-none prose prose-invert overflow-hidden
                    [&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4 [&_img]:mx-auto [&_img]:block [&_img]:bg-white/5 [&_img]:border [&_img]:border-white/10
                    [&_h1]:text-xl [&_h1]:lg:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:break-words
                    [&_h2]:text-lg [&_h2]:lg:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:break-words
                    [&_h3]:text-base [&_h3]:lg:text-lg [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:break-words
                    [&_h4]:text-sm [&_h4]:lg:text-base [&_h4]:font-semibold [&_h4]:text-white [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:break-words
                    [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-white/90 [&_p]:break-words
                    [&_a]:text-blue-400 [&_a]:underline [&_a]:decoration-blue-400/50 [&_a]:underline-offset-2 [&_a]:transition-colors [&_a]:duration-200 [&_a]:break-words
                    [&_a:hover]:text-blue-300 [&_a:hover]:decoration-blue-300 [&_a:visited]:text-purple-400 [&_a:visited]:decoration-purple-400/50
                    [&_pre]:bg-black/30 [&_pre]:border [&_pre]:border-white/20 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:my-4 [&_pre]:overflow-x-auto
                    [&_code]:bg-black/40 [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:text-white/90 [&_code]:break-all
                    [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-white/90 [&_pre_code]:break-normal [&_pre_code]:whitespace-pre
                    [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500/50 [&_blockquote]:bg-blue-500/10 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:rounded-r [&_blockquote]:break-words
                    [&_blockquote_p]:mb-0 [&_blockquote_p]:text-blue-200
                    [&_strong]:font-semibold [&_strong]:text-white [&_strong]:break-words
                    [&_ul]:list-disc [&_ul]:list-inside [&_ul]:mb-4 [&_ul]:space-y-2
                    [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:mb-4 [&_ol]:space-y-2
                    [&_li]:text-white/90 [&_li]:break-words
                    [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-white/20 [&_table]:rounded-lg [&_table]:my-4 [&_table]:bg-white/5
                    [&_table_thead]:bg-white/10
                    [&_table_th]:border [&_table_th]:border-white/20 [&_table_th]:px-4 [&_table_th]:py-3 [&_table_th]:text-left [&_table_th]:font-medium [&_table_th]:text-white [&_table_th]:bg-white/10 [&_table_th]:break-words [&_table_th]:min-w-[100px]
                    [&_table_td]:border [&_table_td]:border-white/20 [&_table_td]:px-4 [&_table_td]:py-3 [&_table_td]:text-white/90 [&_table_td]:bg-white/5 [&_table_td]:break-words [&_table_td]:min-w-[100px]
                    [&_table_tr:nth-child(even)_td]:bg-white/10
                    [&_table_tbody_tr:hover_td]:bg-white/15'
                  dangerouslySetInnerHTML={{ __html: preprocessImageUrls(model.detail_html) }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  return (
    <AppLayout
      sidebar={
        <Sidebar>
          <Toolbar />
        </Sidebar>
      }
    >
      <div className='flex flex-col h-full'>
        <TitleBar>
          <div className='flex items-center space-x-3'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => navigate(-1)}
              className='text-white/70 hover:text-white hover:bg-white/10 p-2 no-drag'
            >
              <ArrowLeft size={16} />
            </Button>
            <span className='text-white font-medium'>
              {modelName ? `Model Details - ${modelName}` : 'Model Details'}
            </span>
          </div>
        </TitleBar>

        {renderContent()}
      </div>

      <DownloadProgress />
    </AppLayout>
  );
};

export default ModelDetail;
