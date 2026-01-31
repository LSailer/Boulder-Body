import SwiftUI

struct ContentView: View {
    @EnvironmentObject var sessionStore: SessionStore
    @State private var activeSession: BoulderSession?
    @State private var completedSession: BoulderSession?

    var body: some View {
        NavigationStack {
            if let session = completedSession {
                SessionSummaryView(
                    session: session,
                    onDone: {
                        completedSession = nil
                    }
                )
            } else if let session = Binding($activeSession) {
                BoulderTrackingView(
                    session: session,
                    onComplete: { finished in
                        activeSession = nil
                        completedSession = finished
                    }
                )
            } else {
                SessionSetupView(onStart: { session in
                    activeSession = session
                })
            }
        }
    }
}

private extension Binding {
    init?(_ source: Binding<Value?>) {
        guard source.wrappedValue != nil else { return nil }
        self.init(
            get: { source.wrappedValue! },
            set: { source.wrappedValue = $0 }
        )
    }
}

#Preview {
    ContentView()
        .environmentObject(SessionStore())
}
