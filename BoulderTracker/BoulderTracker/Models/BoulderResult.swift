import SwiftUI

/// Outcome of a single boulder attempt.
enum BoulderResult: String, Codable, CaseIterable, Identifiable {
    /// Completed on the first try.
    case flash
    /// Completed after multiple attempts.
    case done
    /// Did not complete.
    case fail

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .flash: return "Flash"
        case .done: return "Done"
        case .fail: return "Fail"
        }
    }

    var emoji: String {
        switch self {
        case .flash: return "⚡"
        case .done: return "✅"
        case .fail: return "❌"
        }
    }

    var color: Color {
        switch self {
        case .flash: return .yellow
        case .done: return .green
        case .fail: return .red
        }
    }
}
