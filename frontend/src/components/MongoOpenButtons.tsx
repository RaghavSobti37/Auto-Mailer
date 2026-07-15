'use client';

type MongoTarget = {
  configured?: boolean;
  kind?: string;
  host?: string | null;
  database?: string | null;
  collection?: string | null;
  openUrl?: string | null;
  redactedUri?: string | null;
};

type MongoOpenButtonsProps = {
  local?: MongoTarget | null;
  onlineBackup?: MongoTarget | null;
  compact?: boolean;
};

function openTarget(target?: MongoTarget | null, label?: string) {
  if (!target?.configured) return;
  if (target.openUrl) {
    window.open(target.openUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  const path = [target.database, target.collection].filter(Boolean).join('.');
  window.prompt(`${label || 'Mongo'} path (copy into Compass / Atlas Data Explorer):`, path || target.redactedUri || '');
}

export function MongoOpenButtons({ local, onlineBackup, compact = false }: MongoOpenButtonsProps) {
  const btn = compact ? 'btn-secondary px-2 py-0.5 text-[10px]' : 'btn-secondary px-2 py-1 text-xs';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? '' : 'mt-1'}`}>
      <button
        type="button"
        className={btn}
        disabled={!local?.configured}
        title={local?.configured
          ? `${local.database}.${local.collection} @ ${local.host || 'local'}`
          : 'Local Mongo not configured'}
        onClick={() => openTarget(local, 'Local Mongo')}
      >
        Open local
      </button>
      <button
        type="button"
        className={btn}
        disabled={!onlineBackup?.configured}
        title={onlineBackup?.configured
          ? `${onlineBackup.database}.${onlineBackup.collection} @ ${onlineBackup.host || 'online'}`
          : 'ONLINE_BACKUP_MONGODB_URI not set'}
        onClick={() => openTarget(onlineBackup, 'Online backup')}
      >
        Open online backup
      </button>
    </div>
  );
}
