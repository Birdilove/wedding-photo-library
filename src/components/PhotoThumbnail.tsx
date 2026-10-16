import type { PhotoItem } from '../types/photo';
export const PhotoThumbnail = ({ item }: { item: PhotoItem }) => (
  <div className={'thumb ' + item.status} title={item.status}>{item.thumb && <img src={item.thumb} alt="" />}<i /></div>);
