import Foundation

/// A single boulder attempt within a session.
struct BoulderAttempt: Identifiable, Codable {
    let id: UUID
    var result: BoulderResult?

    init(id: UUID = UUID(), result: BoulderResult? = nil) {
        self.id = id
        self.result = result
    }

    var isCompleted: Bool {
        result != nil
    }
}
