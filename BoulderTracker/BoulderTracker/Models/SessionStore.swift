import Foundation

/// Persists session history to UserDefaults and provides access to past sessions.
class SessionStore: ObservableObject {
    @Published var sessions: [BoulderSession] = []

    private let storageKey = "boulder_sessions"

    init() {
        load()
    }

    var lastSession: BoulderSession? {
        sessions.sorted { $0.date > $1.date }.first
    }

    func save(_ session: BoulderSession) {
        sessions.append(session)
        persist()
    }

    func deleteSession(at offsets: IndexSet) {
        let sorted = sessions.sorted { $0.date > $1.date }
        let toDelete = offsets.map { sorted[$0].id }
        sessions.removeAll { toDelete.contains($0.id) }
        persist()
    }

    // MARK: - Persistence

    private func persist() {
        guard let data = try? JSONEncoder().encode(sessions) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode([BoulderSession].self, from: data)
        else { return }
        sessions = decoded
    }
}
