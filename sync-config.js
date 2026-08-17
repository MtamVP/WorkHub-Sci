window.WORKHUB_SYNC_CONFIG = {
    dbFile: 'sqlite:workhub-sci-cache.db',
    // Actions eligible for optimistic local UI patching on offline write (small allowlist —
    // everything else in MUTATING_ACTIONS still queues+replays correctly, it just won't
    // reflect in the UI instantly while offline).
    optimisticActions: ['saveTask', 'deleteTask', 'createJournal', 'updateJournal', 'deleteJournal'],
    describeAction: function (action, params) {
        var labels = {
            saveTask: 'Lưu công việc "' + (params.name || '') + '"',
            deleteTask: 'Xoá công việc',
            createJournal: 'Tạo nhật ký "' + (params.name || '') + '"',
            updateJournal: 'Cập nhật nhật ký',
            duplicateJournal: 'Nhân bản nhật ký',
            deleteJournal: 'Xoá nhật ký',
            createProject: 'Tạo dự án "' + (params.name || '') + '"',
            updateProject: 'Cập nhật dự án',
            deleteProject: 'Xoá dự án',
            createEvent: 'Tạo sự kiện',
            updateEvent: 'Cập nhật sự kiện',
            deleteEvent: 'Xoá sự kiện'
        };
        return labels[action] || action;
    }
};
